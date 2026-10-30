"""
Unit and integration tests for Sovereign GEOINT & JKR-BIM Spatial Intelligence Engine.
Tests:
- Point-In-Polygon Ray-Casting containment
- Camera FOV line-of-sight circular wedge intersection
- High-risk blind-spot detection (Bilik Iron ASPURA, Belakang Kantin)
- Residential curfew surge multiplier (22:30 - 05:00)
- JEV SHACL-SPATIAL-01 (Off-campus boundary enforcement)
- JEV SHACL-BIM-01 (Dormitory curfew low-tier prevention)
- POST /api/incidents/{incident_id}/export-geojson endpoint
"""

import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.main import app
from backend.nodes.spatial_engine import (
    calculate_bearing_degrees,
    evaluate_spatial_triage,
    haversine_distance_meters,
    point_in_camera_fov,
    point_in_polygon,
)
from backend.jev import (
    ActionVerb,
    JevActionPayload,
    JevOntologyFirewall,
    ThreatTier,
)


class TestSovereignGeointSpatialTriage(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_ray_casting_point_in_polygon(self):
        # Unit square: (0,0) to (10,10)
        square = [[0.0, 0.0], [10.0, 0.0], [10.0, 10.0], [0.0, 10.0]]
        self.assertTrue(point_in_polygon(5.0, 5.0, square))
        self.assertTrue(point_in_polygon(1.0, 1.0, square))
        self.assertFalse(point_in_polygon(15.0, 5.0, square))
        self.assertFalse(point_in_polygon(-1.0, 5.0, square))

    def test_camera_fov_circular_wedge_geometry(self):
        # Camera located at (101.5272, 3.0772) pointing North-East (45 deg) with FOV 75 deg and range 40m
        cam_lon, cam_lat = 101.5272, 3.0772
        bearing = 45.0
        fov = 75.0
        range_m = 40.0

        # Point inside FOV cone (approx 20m away towards bearing 45 deg)
        target_lon = 101.52735
        target_lat = 3.07735
        self.assertTrue(point_in_camera_fov(target_lon, target_lat, cam_lon, cam_lat, bearing, fov, range_m))

        # Point completely opposite direction (South-West)
        opp_lon = 101.5270
        opp_lat = 3.0770
        self.assertFalse(point_in_camera_fov(opp_lon, opp_lat, cam_lon, cam_lat, bearing, fov, range_m))

        # Point in direction but way out of range (> 100m)
        far_lon = 101.5350
        far_lat = 3.0850
        self.assertFalse(point_in_camera_fov(far_lon, far_lat, cam_lon, cam_lat, bearing, fov, range_m))

    def test_blind_spot_detection_bilik_iron_aspura(self):
        # Coordinates inside Bilik Menggosok ASPURA: [101.5287, 3.0788]
        report = evaluate_spatial_triage(101.5287, 3.0788, campus_id="smk-seksyen-11")
        self.assertTrue(report.is_inside_campus)
        self.assertTrue(report.is_blind_spot)
        self.assertIn("Bilik Menggosok", report.matched_zone["properties"]["name"])
        self.assertGreaterEqual(report.spatial_risk_multiplier, 1.5)

    def test_camera_intersection_main_gate(self):
        # Coordinates in front of Pos Pengawal / Pintu Utama: [101.5273, 3.0773]
        report = evaluate_spatial_triage(101.5273, 3.0773, campus_id="smk-seksyen-11")
        self.assertTrue(report.is_inside_campus)
        cam_ids = [c["camera_id"] for c in report.intersecting_cameras]
        self.assertIn("CAM-01-MAIN-GATE", cam_ids)

    def test_residential_curfew_surge_multiplier(self):
        # Coordinates inside ASPURA at 02:00 AM (Curfew Active)
        curfew_time = datetime(2026, 10, 15, 2, 0, 0, tzinfo=timezone.utc)
        report = evaluate_spatial_triage(101.5287, 3.0788, campus_id="smk-seksyen-11", timestamp=curfew_time)
        self.assertTrue(report.is_curfew_violation)
        self.assertGreaterEqual(report.spatial_risk_multiplier, 2.0)
        self.assertTrue(any("Residential Warden" in d for d in report.recommended_dispatches))

    def test_shacl_spatial_01_off_campus_boundary_enforcement(self):
        # Off-campus incident coordinates
        payload = JevActionPayload(
            action=ActionVerb.TRIGGER_CAMPUS_DISPATCH,
            incident_id="inc_off_campus_01",
            current_tier=ThreatTier.TIER_3_ELEVATED,
            target_tier=ThreatTier.TIER_4_CRITICAL,
            actor_id="persona_external",
            location_id="ZONE_OFF_CAMPUS",
            evidence_ids=["evi_01"],
            semantic_confidence=0.95,
            slang_ambiguity_score=0.05,
            event_timestamp=datetime.now(timezone.utc),
            is_off_campus=True,
        )
        active_nodes = {"persona_external", "evi_01", "ZONE_OFF_CAMPUS"}
        violations = JevOntologyFirewall.evaluate_payload(payload, active_nodes)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-SPATIAL-01", rule_ids)

    def test_shacl_bim_01_dormitory_curfew_low_tier_prevention(self):
        # Hostel incident during curfew cannot be triaged as TIER_1_INFO
        payload = JevActionPayload(
            action=ActionVerb.ESCALATE_THREAT_TIER,
            incident_id="inc_hostel_01",
            current_tier=ThreatTier.TIER_1_INFO,
            target_tier=ThreatTier.TIER_1_INFO,
            actor_id="persona_student",
            location_id="HOTSPOT_BILIK_IRON",
            evidence_ids=["evi_02"],
            semantic_confidence=0.85,
            slang_ambiguity_score=0.05,
            event_timestamp=datetime.now(timezone.utc),
            is_curfew_violation=True,
        )
        active_nodes = {"persona_student", "evi_02", "HOTSPOT_BILIK_IRON"}
        violations = JevOntologyFirewall.evaluate_payload(payload, active_nodes)
        rule_ids = [v.rule_id for v in violations]
        self.assertIn("SHACL-BIM-01", rule_ids)

    def test_export_incident_geojson_endpoint(self):
        from backend.main import export_incident_geojson
        data = export_incident_geojson("inc_test_geoint_99", None)
        self.assertEqual(data.get("type"), "FeatureCollection")
        self.assertIn("metadata", data)
        self.assertEqual(data["metadata"]["specification"], "RFC 7946 / RustGIS v0.1.0 Ready")
        features = data.get("features", [])
        self.assertGreaterEqual(len(features), 5)
        # Verify incident feature is included
        inc_feat = next((f for f in features if f.get("id") == "INCIDENT_inc_test_geoint_99"), None)
        self.assertIsNotNone(inc_feat)
        self.assertEqual(inc_feat["geometry"]["type"], "Point")

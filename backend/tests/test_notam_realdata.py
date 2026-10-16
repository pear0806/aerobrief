"""取自 2026-10-16 FAA NOTAM Search 對 RCTP 的真實回應。"""
from datetime import datetime, timezone

import pytest

from notam_parser import (CAT_GENERAL, CAT_TWY, CAT_TWY_CLOSED, CAT_WORK,
                          categorize_notam, notam_state, parse_faa_datetime,
                          process_notams)

NOW = datetime(2026, 10, 16, 8, 30, tzinfo=timezone.utc)

REAL_TWY_E = ("A2859/26 NOTAMR A2069/26\r\nQ) RCAA/QMXLT/IV/M/A/000/999/2505N12114E005\r\nA) RCTP\r\n"
              "B) 2608140835 C) 2610310900EST\r\nE) PORTION OF TWY E BTN TWY P(EXCLUDED) AND TWY Q(EXCLUDED) ONLY\r\n"
              "AVBL FOR ACFT WITH CODE LETTER A, B, C, D, E.\r\n(REF ICAO ANNEX 14 AERODROMES, TABLE 1-1 AERODROME REFERENCE CODE)\r\n"
              "RMK: ACFT TYPE B748 TOWING IS PERMITTED.")
REAL_TWY_R_PRKG = ("A3100/26 NOTAMN\r\nQ) RCAA/QMXLC/IV/BO/A/000/999/2505N12114E005\r\nA) RCTP\r\n"
                   "B) 2610230000 C) 2701192359EST\r\nE) PORTION OF TWY R BTN TWY R1(INCLUDED) AND TWY R3(EXCLUDED)\r\nCLSD FOR ACFT PRKG.")
REAL_OBST = ("A3000/26 NOTAMN\r\nQ) RCAA/QOBCE/IV/M/A/000/999/2505N12114E005\r\nA) RCTP\r\nB) 2610010000 C) 2612010800EST\r\n"
             "E) OBST ERECTED DUE TO NEW GP ANTENNA WIP, INFO AS FLW:\r\n1.COORD: 250344.75N 1211338.96E\r\n2.MAX HGT: 15M AGL\r\n"
             "3.LOW-INTENSITY TYPE B OBST LGT ON TOP.")
REAL_SUP = ("A0001/26 NOTAMN\r\nQ) RCAA/QXXXX/IV/M/A/000/999/2505N12114E005\r\nA) RCTP\r\nB) 2601010000 C) PERM\r\n"
            "E) GROUND MANEUVERING RESTRICTIONS FOR AERODROME REFERENCE\r\nCODE F AIRCRAFT AT TAIPEI/TAIWAN TAOYUAN INTERNATIONAL AIRPORT.\r\n"
            "THIS AIP SUP REPLACES AIP SUP 14/22.")


def test_real_twy_avbl_only_is_info():
    assert categorize_notam(REAL_TWY_E) == CAT_TWY


def test_real_clsd_for_acft_prkg_is_not_a_taxiway_closure():
    assert categorize_notam(REAL_TWY_R_PRKG) != CAT_TWY_CLOSED
    assert categorize_notam(REAL_TWY_R_PRKG) == CAT_TWY


def test_real_obstacle_with_wip():
    assert categorize_notam(REAL_OBST) == CAT_WORK


def test_real_aip_sup_is_general():
    assert categorize_notam(REAL_SUP) == CAT_GENERAL


def test_a_real_taxiway_closure_is_still_detected():
    assert categorize_notam("E) TWY R CLSD DUE TO WIP") == CAT_TWY_CLOSED


@pytest.mark.parametrize("v,dt,est", [
    ("08/14/2026 0835", datetime(2026, 8, 14, 8, 35, tzinfo=timezone.utc), False),
    ("10/31/2026 0900EST", datetime(2026, 10, 31, 9, 0, tzinfo=timezone.utc), True),
    ("PERM", None, False), (None, None, False), ("garbage", None, False), ("13/45/2026 0000", None, False),
])
def test_parse_faa_datetime(v, dt, est):
    assert parse_faa_datetime(v) == (dt, est)


def test_notam_state():
    t = lambda d: datetime(2026, 10, d, tzinfo=timezone.utc)  # noqa: E731
    assert notam_state(t(23), None, NOW) == "upcoming"
    assert notam_state(t(1), t(31), NOW) == "active"
    assert notam_state(t(1), t(10), NOW) == "expired"
    assert notam_state(None, t(31), NOW) == "unknown"


def test_process_marks_future_and_drops_expired_and_sorts_active_first():
    out = process_notams({"notamList": [
        {"notamNumber": "UP", "icaoMessage": REAL_TWY_R_PRKG, "startDate": "10/23/2026 0000", "endDate": "01/19/2027 2359EST"},
        {"notamNumber": "OLD", "icaoMessage": "E) RWY 05 CLSD", "startDate": "01/01/2026 0000", "endDate": "02/01/2026 0000"},
        {"notamNumber": "GEN", "icaoMessage": REAL_SUP, "startDate": "01/01/2026 0000", "endDate": "PERM"},
        {"notamNumber": "RWY", "icaoMessage": "E) RWY 05L CLSD", "startDate": "10/16/2026 0000", "endDate": "10/17/2026 0000"},
    ]}, now=NOW)
    assert [n["id"] for n in out] == ["RWY", "GEN", "UP"]  # active(嚴重度) → upcoming
    assert out[0]["state"] == "active" and out[2]["state"] == "upcoming"
    assert out[1]["end_time"] == "PERM"
    assert out[2]["estimated_end"] is True and "預估" in out[2]["end_time"]
    assert out[2]["start_time"] == "2026-10-23 00:00Z"


def test_cancelled_flag_is_dropped():
    out = process_notams({"notamList": [{"icaoMessage": "E) RWY 05 CLSD", "startDate": "10/16/2026 0000",
                                         "endDate": "10/20/2026 0000", "cancelledOrExpired": True}]}, now=NOW)
    assert out == []


def test_unparseable_dates_are_kept_visible():
    out = process_notams({"notamList": [{"icaoMessage": "E) RWY 05 CLSD", "startDate": "weird", "endDate": "weird"}]}, now=NOW)
    assert len(out) == 1 and out[0]["state"] == "unknown" and out[0]["start_time"] == "weird"

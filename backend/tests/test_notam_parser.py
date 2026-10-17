import pytest

from notam_parser import categorize_notam, process_notams


@pytest.mark.parametrize("text,expected", [
    ("RWY 05L/23R CLSD", "🚨 跑道關閉"),
    ("TWY A CLSD", "🚧 滑行道關閉"),
    ("TWY B LIGHTING U/S", "🚕 滑行道資訊"),
    ("VOR TPE U/S", "📡 導航設施"),
    ("CRANE ERECTED", "🏗️ 施工與障礙物"),
])
def test_basic_categories(text, expected):
    assert categorize_notam(text) == expected


# ---- 以下是「應該要對、目前可能錯」的行為；失敗 = 已確認的 bug ----

def test_bug_negation_not_clsd_is_not_closure():
    assert categorize_notam("RWY 05L NOT CLSD") != "🚨 跑道關閉"


def test_bug_ils_on_runway_is_navaid():
    assert categorize_notam("ILS RWY 05L U/S") == "📡 導航設施"


def test_bug_crane_near_runway_is_obstacle():
    assert categorize_notam("CRANE ERECTED 300FT RWY 23 APCH") == "🏗️ 施工與障礙物"


def test_bug_substring_false_positive_favorable():
    assert categorize_notam("FAVORABLE CONDITIONS") == "📝 一般資訊"


def test_bug_wip_on_taxiway_is_construction_or_twy():
    # 至少不應被歸為純「滑行道資訊」而漏掉施工資訊（需產品決策，這裡只記錄現況）
    assert categorize_notam("WIP ON TWY B") in ("🏗️ 施工與障礙物", "🚧 滑行道關閉")


def test_process_notams_empty_inputs():
    assert process_notams(None) == []
    assert process_notams({}) == []
    assert process_notams({"notamList": [{"icaoMessage": " ", "traditionalMessageFrom4thWord": ""}]}) == []


def test_process_notams_sorted_by_severity():
    out = process_notams({"notamList": [
        {"icaoMessage": "GENERAL TEXT"},
        {"icaoMessage": "RWY 05 CLSD"},
    ]})
    assert out[0]["category"] == "🚨 跑道關閉"


def test_bug_missing_dates_not_none():
    out = process_notams({"notamList": [{"icaoMessage": "RWY 05 CLSD", "startDate": None}]})
    assert out[0]["start_time"] not in (None, "None")


# ---------------- 機場關閉 / NOT AVBL / 結構化跑道 ----------------
import pytest  # noqa: E402

from notam_parser import (CAT_AD_CLOSED, CAT_GENERAL, CAT_NAV, CAT_RWY,  # noqa: E402
                          CAT_RWY_CLOSED, CAT_TWY_CLOSED, analyze_closure, _body,
                          process_notams, summarize_closures)


@pytest.mark.parametrize("text,cat", [
    ("E) AD AP CLSD", CAT_AD_CLOSED),
    ("E) AERODROME CLOSED DUE TO WX", CAT_AD_CLOSED),
    ("E) AIRPORT CLSD", CAT_AD_CLOSED),
    ("E) AD CLSD TO ALL TFC EXC EMERG", CAT_AD_CLOSED),
    ("E) AD NOT CLSD", CAT_GENERAL),
    ("E) AD TWY A CLSD", CAT_TWY_CLOSED),          # AD 沒有緊接 CLSD
    ("E) RWY 05L/23R NOT AVBL", CAT_RWY_CLOSED),
    ("E) RWY 05L U/S", CAT_RWY_CLOSED),
    ("E) RUNWAY 05L CLOSURE", CAT_RWY_CLOSED),
    ("E) RWY 05L PAPI NOT AVBL", CAT_RWY),         # 設施不可用 ≠ 跑道不可用
    ("E) RWY 05L LGT U/S", CAT_RWY),
    ("E) ILS RWY 05L U/S", CAT_NAV),
])
def test_closure_categories(text, cat):
    assert categorize_notam(text) == cat


@pytest.mark.parametrize("text,runways", [
    ("E) RWY 05L/23R CLSD", ["05L", "23R"]),
    ("E) RWY 05L AND 23R CLSD", ["05L", "23R"]),
    ("E) RWY 09/27 CLOSED EXC FOR LANDING", ["09", "27"]),
    ("E) ALL RWY CLSD", ["ALL"]),
    ("E) RWY CLSD", []),
    ("E) ILS RWY 05L CLSD", []),
    ("E) RWY 05L CLSD. TWY B CLSD", ["05L"]),
])
def test_closed_runway_extraction(text, runways):
    assert analyze_closure(_body(text))[1] == runways


def test_summarize_closures_ignores_upcoming_and_expired():
    items = [
        {"id": "1", "state": "active", "category": CAT_RWY_CLOSED, "closed_runways": ["05L"], "aerodrome_closed": False},
        {"id": "2", "state": "upcoming", "category": CAT_RWY_CLOSED, "closed_runways": ["09"], "aerodrome_closed": False},
        {"id": "3", "state": "unknown", "category": CAT_AD_CLOSED, "closed_runways": [], "aerodrome_closed": True},
    ]
    s = summarize_closures(items)
    assert s["closed_runways"] == ["05L"] and s["aerodrome_closed"] is True
    assert s["notam_ids"] == ["1", "3"]
    assert summarize_closures(None) == {"aerodrome_closed": False, "closed_runways": [], "notam_ids": []}


def test_process_notams_exposes_structured_fields():
    out = process_notams({"notamList": [{"notamNumber": "X", "icaoMessage": "E) RWY 05L/23R CLSD",
                                         "startDate": "01/01/2020 0000", "endDate": "PERM"}]})
    assert out[0]["closed_runways"] == ["05L", "23R"] and out[0]["aerodrome_closed"] is False

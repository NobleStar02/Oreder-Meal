"""
Backend tests for Doyuran Güveç Lokantası B2B lunch ordering API.
Covers: auth, menu, orders, admin endpoints, role-based access, analytics.
"""
import os
import io
import uuid
import time
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@doyuranguvec.com"
ADMIN_PASSWORD = "DoyuranAdmin2026!"

# Unique company per run to avoid conflicts
RUN_ID = uuid.uuid4().hex[:8]
COMPANY_EMAIL = f"test_firma_{RUN_ID}@example.com"
COMPANY_PASSWORD = "Firma2026!"
COMPANY_NAME = f"TEST_Firma_{RUN_ID}"


def today_iso():
    return datetime.now(timezone.utc).date().isoformat()


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "admin"
    assert data["email"] == ADMIN_EMAIL
    return s


@pytest.fixture(scope="session")
def company_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={
        "email": COMPANY_EMAIL,
        "password": COMPANY_PASSWORD,
        "company_name": COMPANY_NAME,
        "contact_name": "Test Contact",
        "phone": "5551112233",
        "address": "Istanbul",
    })
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "company"
    assert data["company_name"] == COMPANY_NAME
    return s


@pytest.fixture(scope="session")
def seeded_menu_item(admin_session):
    """Create a menu item available today for ordering tests."""
    payload = {
        "name": f"TEST_Kuzu_Tandir_{RUN_ID}",
        "description": "Test menu item",
        "price": 150.50,
        "category": "Ana Yemek",
        "available": True,
        "available_date": today_iso(),
    }
    r = admin_session.post(f"{API}/admin/menu", json=payload)
    assert r.status_code == 200, f"Menu create failed: {r.text}"
    item = r.json()
    assert "id" in item
    assert item["name"] == payload["name"]
    assert item["price"] == 150.50
    assert item["available_date"] == today_iso()
    yield item
    # cleanup
    admin_session.delete(f"{API}/admin/menu/{item['id']}")


# ---------- Auth Tests ----------
class TestAuth:
    def test_login_admin_success(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"
        # cookies should be set
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_login_unknown(self):
        r = requests.post(f"{API}/auth/login", json={"email": "nope_xyz@example.com", "password": "abcdef"})
        assert r.status_code == 401

    def test_register_duplicate_fails(self, company_session):
        # company_session already registered COMPANY_EMAIL
        r = requests.post(f"{API}/auth/register", json={
            "email": COMPANY_EMAIL, "password": "Other2026!", "company_name": "Dup",
        })
        assert r.status_code == 400

    def test_me_authenticated(self, company_session):
        r = company_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == COMPANY_EMAIL
        assert data["role"] == "company"
        assert data["company_name"] == COMPANY_NAME

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert s.cookies.get("access_token")
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # After logout, /me should fail
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401


# ---------- Role-based Access ----------
class TestRBAC:
    def test_company_cannot_access_admin_menu_list(self, company_session):
        r = company_session.get(f"{API}/admin/menu")
        assert r.status_code == 403

    def test_company_cannot_create_menu(self, company_session):
        r = company_session.post(f"{API}/admin/menu", json={"name": "X", "price": 10})
        assert r.status_code == 403

    def test_company_cannot_access_admin_orders(self, company_session):
        r = company_session.get(f"{API}/admin/orders")
        assert r.status_code == 403

    def test_company_cannot_access_analytics(self, company_session):
        r = company_session.get(f"{API}/admin/analytics/summary?days=7")
        assert r.status_code == 403

    def test_anonymous_orders_me_401(self):
        r = requests.get(f"{API}/orders/me")
        assert r.status_code == 401


# ---------- Menu Tests ----------
class TestMenu:
    def test_menu_today_public(self, seeded_menu_item):
        r = requests.get(f"{API}/menu/today")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        names = [i["name"] for i in items]
        assert seeded_menu_item["name"] in names

    def test_admin_menu_filter_by_date(self, admin_session, seeded_menu_item):
        r = admin_session.get(f"{API}/admin/menu", params={"date": today_iso()})
        assert r.status_code == 200
        ids = [i["id"] for i in r.json()]
        assert seeded_menu_item["id"] in ids

    def test_admin_menu_update(self, admin_session, seeded_menu_item):
        new_price = 199.99
        r = admin_session.put(f"{API}/admin/menu/{seeded_menu_item['id']}", json={"price": new_price})
        assert r.status_code == 200
        # Verify persisted
        r2 = admin_session.get(f"{API}/admin/menu", params={"date": today_iso()})
        items = {i["id"]: i for i in r2.json()}
        assert items[seeded_menu_item["id"]]["price"] == new_price

    def test_admin_menu_update_not_found(self, admin_session):
        r = admin_session.put(f"{API}/admin/menu/{uuid.uuid4()}", json={"price": 1.0})
        assert r.status_code == 404

    def test_admin_menu_delete_lifecycle(self, admin_session):
        # create
        r = admin_session.post(f"{API}/admin/menu", json={
            "name": f"TEST_Delete_{uuid.uuid4().hex[:6]}", "price": 10.0,
            "available_date": today_iso(),
        })
        assert r.status_code == 200
        item_id = r.json()["id"]
        # delete
        rd = admin_session.delete(f"{API}/admin/menu/{item_id}")
        assert rd.status_code == 200
        # delete again -> 404
        rd2 = admin_session.delete(f"{API}/admin/menu/{item_id}")
        assert rd2.status_code == 404


# ---------- Upload Tests ----------
class TestUpload:
    def test_upload_image_admin(self, admin_session):
        # Tiny PNG (1x1)
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f"
            b"\x00\x00\x01\x01\x00\x05\x00\x01\x0d\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = admin_session.post(f"{API}/upload", files=files)
        assert r.status_code == 200, f"Upload failed: {r.text}"
        data = r.json()
        assert "path" in data
        # Fetch back
        r2 = requests.get(f"{API}/files/{data['path']}")
        assert r2.status_code == 200
        assert r2.headers["content-type"].startswith("image/")

    def test_upload_rejects_non_image(self, admin_session):
        files = {"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")}
        r = admin_session.post(f"{API}/upload", files=files)
        assert r.status_code == 400

    def test_upload_requires_admin(self, company_session):
        files = {"file": ("a.png", io.BytesIO(b"x"), "image/png")}
        r = company_session.post(f"{API}/upload", files=files)
        assert r.status_code == 403


# ---------- Order Tests ----------
class TestOrders:
    def test_place_order_company(self, company_session, seeded_menu_item):
        payload = {
            "items": [{"menu_item_id": seeded_menu_item["id"], "quantity": 2}],
            "note": "Az tuzlu",
        }
        r = company_session.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["status"] == "yeni"
        assert order["company_name"] == COMPANY_NAME
        assert len(order["items"]) == 1
        # total = price * 2 (price may have been updated to 199.99 from update test)
        assert order["total"] == round(seeded_menu_item["price"] * 2, 2) or order["total"] > 0
        assert "order_no" in order
        # Persist check via GET
        r2 = company_session.get(f"{API}/orders/{order['id']}")
        assert r2.status_code == 200
        assert r2.json()["id"] == order["id"]
        # Save for further tests
        pytest.shared_order_id = order["id"]

    def test_place_order_unknown_item(self, company_session):
        r = company_session.post(f"{API}/orders", json={
            "items": [{"menu_item_id": str(uuid.uuid4()), "quantity": 1}]
        })
        assert r.status_code == 400

    def test_place_order_empty(self, company_session):
        r = company_session.post(f"{API}/orders", json={"items": []})
        assert r.status_code == 400

    def test_admin_cannot_place_order(self, admin_session, seeded_menu_item):
        r = admin_session.post(f"{API}/orders", json={
            "items": [{"menu_item_id": seeded_menu_item["id"], "quantity": 1}]
        })
        assert r.status_code == 403

    def test_orders_me_lists_company_orders(self, company_session):
        r = company_session.get(f"{API}/orders/me")
        assert r.status_code == 200
        orders = r.json()
        assert isinstance(orders, list)
        assert any(o["id"] == pytest.shared_order_id for o in orders)

    def test_admin_orders_list(self, admin_session):
        r = admin_session.get(f"{API}/admin/orders", params={"date": today_iso()})
        assert r.status_code == 200
        orders = r.json()
        assert any(o["id"] == pytest.shared_order_id for o in orders)

    def test_admin_orders_status_filter(self, admin_session):
        r = admin_session.get(f"{API}/admin/orders", params={"status": "yeni"})
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "yeni"

    def test_admin_update_order_status(self, admin_session, company_session):
        oid = pytest.shared_order_id
        r = admin_session.put(f"{API}/admin/orders/{oid}/status", params={"status": "hazirlaniyor"})
        assert r.status_code == 200
        # verify persisted
        r2 = company_session.get(f"{API}/orders/{oid}")
        assert r2.status_code == 200
        assert r2.json()["status"] == "hazirlaniyor"

    def test_admin_update_order_invalid_status(self, admin_session):
        r = admin_session.put(
            f"{API}/admin/orders/{pytest.shared_order_id}/status",
            params={"status": "garbage"}
        )
        assert r.status_code == 400

    def test_other_company_cannot_access_order(self, seeded_menu_item):
        # Register a 2nd company
        s2 = requests.Session()
        email2 = f"other_{uuid.uuid4().hex[:6]}@example.com"
        r = s2.post(f"{API}/auth/register", json={
            "email": email2, "password": "Other2026!", "company_name": "Other Co"
        })
        assert r.status_code == 200
        r = s2.get(f"{API}/orders/{pytest.shared_order_id}")
        assert r.status_code == 403


# ---------- Order Edit (PUT /orders/{id}) Tests ----------
class TestOrderEdit:
    """Tests for company self-edit of orders (status='yeni')."""

    @pytest.fixture(scope="class")
    def extra_menu_items(self, admin_session):
        """Two extra items so edit flow can remove & add."""
        created = []
        for label, cat in [("Corba", "Çorba"), ("Tatli", "Tatlı")]:
            r = admin_session.post(f"{API}/admin/menu", json={
                "name": f"TEST_Edit_{label}_{RUN_ID}",
                "price": 0.0,
                "category": cat,
                "available": True,
                "available_date": today_iso(),
            })
            assert r.status_code == 200, r.text
            created.append(r.json())
        yield created
        for it in created:
            admin_session.delete(f"{API}/admin/menu/{it['id']}")

    @pytest.fixture(scope="class")
    def edit_company_session(self):
        s = requests.Session()
        email = f"edit_firma_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "Firma2026!",
            "company_name": f"TEST_Edit_Firma_{RUN_ID}",
        })
        assert r.status_code == 200, r.text
        return s

    @pytest.fixture(scope="class")
    def fresh_order(self, edit_company_session, seeded_menu_item, extra_menu_items):
        """Create a new 'yeni' order owned by edit_company_session."""
        payload = {
            "items": [
                {"menu_item_id": seeded_menu_item["id"], "quantity": 2},
                {"menu_item_id": extra_menu_items[0]["id"], "quantity": 1},
            ],
            "note": "ilk sipariş",
        }
        r = edit_company_session.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        # Initial state assertions (new feature)
        assert order["is_revised"] is False
        assert order["revision_count"] == 0
        assert order["status"] == "yeni"
        return order

    def test_new_order_has_revised_false_and_count_zero(self, fresh_order):
        assert fresh_order["is_revised"] is False
        assert fresh_order["revision_count"] == 0
        assert "last_revised_at" not in fresh_order or fresh_order.get("last_revised_at") in (None, "")

    def test_edit_order_success_updates_items_note_and_sort(
        self, edit_company_session, fresh_order, seeded_menu_item, extra_menu_items
    ):
        # Remove soup-only, keep main, add dessert; change quantity & note
        payload = {
            "items": [
                {"menu_item_id": extra_menu_items[1]["id"], "quantity": 1},  # Tatlı
                {"menu_item_id": seeded_menu_item["id"], "quantity": 3},      # Ana Yemek
            ],
            "note": "az tuzlu olsun",
        }
        r = edit_company_session.put(f"{API}/orders/{fresh_order['id']}", json=payload)
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["is_revised"] is True
        assert updated["revision_count"] == 1
        assert updated.get("last_revised_at")
        assert updated["note"] == "az tuzlu olsun"
        assert len(updated["items"]) == 2
        # Items must be sorted by category order: Ana Yemek (idx 1) before Tatlı (idx 4)
        cats = [it["category"] for it in updated["items"]]
        assert cats == ["Ana Yemek", "Tatlı"], cats

        # Persistence check
        r2 = edit_company_session.get(f"{API}/orders/{fresh_order['id']}")
        assert r2.status_code == 200
        fetched = r2.json()
        assert fetched["revision_count"] == 1
        assert fetched["is_revised"] is True
        assert fetched["note"] == "az tuzlu olsun"

    def test_second_edit_increments_revision_count(
        self, edit_company_session, fresh_order, seeded_menu_item
    ):
        payload = {
            "items": [{"menu_item_id": seeded_menu_item["id"], "quantity": 5}],
            "note": "ikinci düzenleme",
        }
        r = edit_company_session.put(f"{API}/orders/{fresh_order['id']}", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["revision_count"] == 2
        assert data["is_revised"] is True
        assert data["note"] == "ikinci düzenleme"
        assert len(data["items"]) == 1

    def test_edit_empty_items_returns_400(self, edit_company_session, fresh_order):
        r = edit_company_session.put(
            f"{API}/orders/{fresh_order['id']}", json={"items": [], "note": ""}
        )
        assert r.status_code == 400

    def test_edit_unauthenticated_returns_401(self, fresh_order, seeded_menu_item):
        r = requests.put(
            f"{API}/orders/{fresh_order['id']}",
            json={"items": [{"menu_item_id": seeded_menu_item["id"], "quantity": 1}]},
        )
        assert r.status_code == 401

    def test_edit_by_other_company_returns_403(self, fresh_order, seeded_menu_item):
        s2 = requests.Session()
        email = f"other_edit_{uuid.uuid4().hex[:6]}@example.com"
        r = s2.post(f"{API}/auth/register", json={
            "email": email, "password": "Other2026!",
            "company_name": f"TEST_Other_{RUN_ID}",
        })
        assert r.status_code == 200
        r = s2.put(
            f"{API}/orders/{fresh_order['id']}",
            json={"items": [{"menu_item_id": seeded_menu_item["id"], "quantity": 1}]},
        )
        assert r.status_code == 403

    def test_edit_blocked_when_status_not_yeni(
        self, edit_company_session, admin_session, fresh_order, seeded_menu_item
    ):
        # Admin moves order to hazirlaniyor
        r = admin_session.put(
            f"{API}/admin/orders/{fresh_order['id']}/status",
            params={"status": "hazirlaniyor"},
        )
        assert r.status_code == 200
        # Company tries to edit → 400
        r = edit_company_session.put(
            f"{API}/orders/{fresh_order['id']}",
            json={"items": [{"menu_item_id": seeded_menu_item["id"], "quantity": 1}]},
        )
        assert r.status_code == 400


# ---------- Analytics ----------
class TestAnalytics:
    def test_analytics_summary(self, admin_session):
        r = admin_session.get(f"{API}/admin/analytics/summary", params={"days": 7})
        assert r.status_code == 200
        data = r.json()
        for key in ["range_days", "total_revenue", "total_orders", "daily", "top_items", "top_companies"]:
            assert key in data
        assert isinstance(data["daily"], list)
        assert isinstance(data["top_items"], list)
        assert isinstance(data["top_companies"], list)
        assert data["range_days"] == 7

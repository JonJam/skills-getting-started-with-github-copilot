import pytest
from fastapi.testclient import TestClient


def test_root_redirect(client):
    """Test that root path redirects to static/index.html"""
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities(client):
    """Test getting all activities"""
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    
    # Check that activities exist
    assert isinstance(data, dict)
    assert len(data) > 0
    
    # Check structure of an activity
    assert "Chess Club" in data
    activity = data["Chess Club"]
    assert "description" in activity
    assert "schedule" in activity
    assert "max_participants" in activity
    assert "participants" in activity
    assert isinstance(activity["participants"], list)


def test_signup_for_activity(client):
    """Test signing up for an activity"""
    email = "test.student@mergington.edu"
    activity_name = "Chess Club"
    
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert email in data["message"]
    assert activity_name in data["message"]
    
    # Verify the participant was added
    activities = client.get("/activities").json()
    assert email in activities[activity_name]["participants"]


def test_signup_duplicate_email(client):
    """Test that duplicate signups are rejected"""
    email = "michael@mergington.edu"  # Already registered in Chess Club
    activity_name = "Chess Club"
    
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email}
    )
    
    assert response.status_code == 400
    data = response.json()
    assert "already signed up" in data["detail"]


def test_signup_nonexistent_activity(client):
    """Test signing up for a non-existent activity"""
    email = "test@mergington.edu"
    activity_name = "Nonexistent Activity"
    
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email}
    )
    
    assert response.status_code == 404
    data = response.json()
    assert "Activity not found" in data["detail"]


def test_unregister_from_activity(client):
    """Test unregistering from an activity"""
    email = "michael@mergington.edu"  # Already registered in Chess Club
    activity_name = "Chess Club"
    
    # Verify they're registered
    activities = client.get("/activities").json()
    assert email in activities[activity_name]["participants"]
    
    # Unregister
    response = client.post(
        f"/activities/{activity_name}/unregister",
        params={"email": email}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "Unregistered" in data["message"]
    assert email in data["message"]
    
    # Verify they're no longer registered
    activities = client.get("/activities").json()
    assert email not in activities[activity_name]["participants"]


def test_unregister_not_registered(client):
    """Test unregistering someone not registered"""
    email = "not.registered@mergington.edu"
    activity_name = "Chess Club"
    
    response = client.post(
        f"/activities/{activity_name}/unregister",
        params={"email": email}
    )
    
    assert response.status_code == 400
    data = response.json()
    assert "not registered" in data["detail"]


def test_unregister_nonexistent_activity(client):
    """Test unregistering from a non-existent activity"""
    email = "test@mergington.edu"
    activity_name = "Nonexistent Activity"
    
    response = client.post(
        f"/activities/{activity_name}/unregister",
        params={"email": email}
    )
    
    assert response.status_code == 404
    data = response.json()
    assert "Activity not found" in data["detail"]


def test_signup_and_unregister_flow(client):
    """Test full signup and unregister flow"""
    email = "flow.test@mergington.edu"
    activity_name = "Programming Class"
    
    # Sign up
    signup_response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email}
    )
    assert signup_response.status_code == 200
    
    # Verify signup
    activities = client.get("/activities").json()
    assert email in activities[activity_name]["participants"]
    participant_count = len(activities[activity_name]["participants"])
    
    # Unregister
    unregister_response = client.post(
        f"/activities/{activity_name}/unregister",
        params={"email": email}
    )
    assert unregister_response.status_code == 200
    
    # Verify unregister
    activities = client.get("/activities").json()
    assert email not in activities[activity_name]["participants"]
    assert len(activities[activity_name]["participants"]) == participant_count - 1

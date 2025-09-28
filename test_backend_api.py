#!/usr/bin/env python3
"""
Comprehensive backend API testing script.
Tests all endpoints and functionality.
"""

import requests
import json
import time
import sys

API_BASE = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, expected_status=200):
    """Test a single API endpoint."""
    url = f"{API_BASE}{endpoint}"
    print(f"\n{'='*50}")
    print(f"Testing {method} {endpoint}")
    print(f"URL: {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers={'Content-Type': 'application/json'}, timeout=10)
        else:
            print(f"❌ Unsupported method: {method}")
            return False
            
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == expected_status:
            print("✅ Status code matches expected")
        else:
            print(f"❌ Expected {expected_status}, got {response.status_code}")
            
        try:
            response_data = response.json()
            print(f"Response: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response (text): {response.text}")
            
        return response.status_code == expected_status
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - is the server running?")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("Backend API Test Suite")
    print("=" * 50)
    
    # Test health endpoint
    test_endpoint("GET", "/health")
    
    # Test prediction endpoint
    prediction_data = {
        "user_id": "test_user",
        "count": 2,
        "mix": True
    }
    test_endpoint("POST", "/api/parlays/predict", prediction_data)
    
    # Test history endpoint
    test_endpoint("GET", "/api/parlays/history?user_id=test_user&limit=10")
    
    # Test submitted endpoint
    test_endpoint("GET", "/api/parlays/submitted?user_id=test_user")
    
    # Test parlay submission
    submit_data = {
        "user_id": "test_user",
        "source": "test",
        "legs": [
            {
                "player_id": "bbp1",
                "player_name": "Jayson Tatum",
                "sport": "basketball",
                "stat": "points",
                "direction": "over",
                "line": 27.5,
                "base_prob": 0.55
            },
            {
                "player_id": "bbp2",
                "player_name": "Giannis Antetokounmpo",
                "sport": "basketball",
                "stat": "rebounds",
                "direction": "over",
                "line": 11.5,
                "base_prob": 0.57
            }
        ]
    }
    test_endpoint("POST", "/api/parlays/submit", submit_data)
    
    print("\n" + "=" * 50)
    print("Test suite completed!")

if __name__ == "__main__":
    main()

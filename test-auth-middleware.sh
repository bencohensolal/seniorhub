#!/bin/bash

# Test script for unified authentication middleware
# This script verifies that both Bearer token and x-user-* headers work correctly

echo "🧪 Testing Unified Authentication Middleware"
echo "============================================="
echo ""

# Configuration
BASE_URL="${API_URL:-http://localhost:3000}"
HOUSEHOLD_ID="test-household-123"

# Test JWT payload (base64 encoded)
# Payload: {"sub":"user123","email":"test@example.com","given_name":"John","family_name":"Doe"}
JWT_HEADER="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
JWT_PAYLOAD="eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZ2l2ZW5fbmFtZSI6IkpvaG4iLCJmYW1pbHlfbmFtZSI6IkRvZSJ9"
JWT_SIGNATURE="fake-signature-for-testing"
JWT_TOKEN="${JWT_HEADER}.${JWT_PAYLOAD}.${JWT_SIGNATURE}"

echo "Test 1: Authentication with Bearer Token (JWT)"
echo "-----------------------------------------------"
echo "Testing GET /v1/households/${HOUSEHOLD_ID}/tasks with Bearer token..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/v1/households/${HOUSEHOLD_ID}/tasks" || echo "Request failed"
echo ""
echo ""

echo "Test 2: Authentication with x-user-* Headers (Legacy)"
echo "-----------------------------------------------"
echo "Testing GET /v1/households/${HOUSEHOLD_ID}/tasks with x-user-* headers..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "x-user-id: user123" \
  -H "x-user-email: test@example.com" \
  -H "x-user-first-name: John" \
  -H "x-user-last-name: Doe" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/v1/households/${HOUSEHOLD_ID}/tasks" || echo "Request failed"
echo ""
echo ""

echo "Test 3: No Authentication (Should Fail with 401)"
echo "-----------------------------------------------"
echo "Testing GET /v1/households/${HOUSEHOLD_ID}/tasks without authentication..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/v1/households/${HOUSEHOLD_ID}/tasks" || echo "Request failed"
echo ""
echo ""

echo "Test 4: Public Endpoint (Should Succeed Without Auth)"
echo "-----------------------------------------------"
echo "Testing GET /health without authentication..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  "${BASE_URL}/health" || echo "Request failed"
echo ""
echo ""

echo "✅ Test suite completed!"
echo ""
echo "Expected Results:"
echo "  - Test 1 & 2: Should return data or 403/404 (not 401)"
echo "  - Test 3: Should return 401 Unauthorized"
echo "  - Test 4: Should return 200 OK with {\"status\":\"ok\"}"

import requests
import json
import time
import sys
from datetime import datetime

class ORMAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_brands = []
        self.created_comments = []
        self.created_mentions = []
        self.created_alerts = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_create_brand(self, name, facebook_id=None, instagram_id=None):
        """Test creating a brand"""
        data = {
            "name": name,
            "facebook_page_id": facebook_id,
            "instagram_business_id": instagram_id
        }
        success, response = self.run_test(
            f"Create Brand: {name}", 
            "POST", 
            "brands", 
            200, 
            data=data
        )
        if success and 'id' in response:
            self.created_brands.append(response)
        return success, response

    def test_get_brands(self):
        """Test getting all brands"""
        return self.run_test("Get All Brands", "GET", "brands", 200)

    def test_get_brand(self, brand_id):
        """Test getting a specific brand"""
        return self.run_test(f"Get Brand: {brand_id}", "GET", f"brands/{brand_id}", 200)

    def test_update_brand(self, brand_id, name):
        """Test updating a brand"""
        data = {"name": name}
        return self.run_test(f"Update Brand: {brand_id}", "PUT", f"brands/{brand_id}", 200, data=data)

    def test_delete_brand(self, brand_id):
        """Test deleting a brand"""
        return self.run_test(f"Delete Brand: {brand_id}", "DELETE", f"brands/{brand_id}", 200)

    def test_create_comment(self, brand_id, platform, content, author_name):
        """Test creating a comment"""
        data = {
            "brand_id": brand_id,
            "platform": platform,
            "platform_id": f"test_comment_{int(time.time())}",
            "content": content,
            "author_name": author_name,
            "author_id": f"author_{int(time.time())}",
            "post_id": f"post_{int(time.time())}"
        }
        success, response = self.run_test(
            f"Create Comment for brand: {brand_id}", 
            "POST", 
            "comments", 
            200, 
            data=data
        )
        if success and 'id' in response:
            self.created_comments.append(response)
        return success, response

    def test_get_comments(self, brand_id=None, platform=None, sentiment_type=None, needs_response=None):
        """Test getting comments with filters"""
        params = {}
        if brand_id:
            params["brand_id"] = brand_id
        if platform:
            params["platform"] = platform
        if sentiment_type:
            params["sentiment_type"] = sentiment_type
        if needs_response is not None:
            params["needs_response"] = needs_response
        
        return self.run_test(
            f"Get Comments with filters", 
            "GET", 
            "comments", 
            200, 
            params=params
        )

    def test_mark_comment_responded(self, comment_id):
        """Test marking a comment as responded"""
        return self.run_test(
            f"Mark Comment as Responded: {comment_id}", 
            "PUT", 
            f"comments/{comment_id}/respond", 
            200
        )

    def test_create_mention(self, brand_id, platform, content, author_name, url):
        """Test creating a mention"""
        data = {
            "brand_id": brand_id,
            "platform": platform,
            "platform_id": f"test_mention_{int(time.time())}",
            "content": content,
            "author_name": author_name,
            "author_id": f"author_{int(time.time())}",
            "url": url,
            "reach": 100,
            "engagement": 50
        }
        success, response = self.run_test(
            f"Create Mention for brand: {brand_id}", 
            "POST", 
            "mentions", 
            200, 
            data=data
        )
        if success and 'id' in response:
            self.created_mentions.append(response)
        return success, response

    def test_get_mentions(self, brand_id=None, platform=None, sentiment_type=None):
        """Test getting mentions with filters"""
        params = {}
        if brand_id:
            params["brand_id"] = brand_id
        if platform:
            params["platform"] = platform
        if sentiment_type:
            params["sentiment_type"] = sentiment_type
        
        return self.run_test(
            f"Get Mentions with filters", 
            "GET", 
            "mentions", 
            200, 
            params=params
        )

    def test_get_alerts(self, brand_id=None, alert_type=None, severity=None, is_acknowledged=None):
        """Test getting alerts with filters"""
        params = {}
        if brand_id:
            params["brand_id"] = brand_id
        if alert_type:
            params["alert_type"] = alert_type
        if severity:
            params["severity"] = severity
        if is_acknowledged is not None:
            params["is_acknowledged"] = is_acknowledged
        
        success, response = self.run_test(
            f"Get Alerts with filters", 
            "GET", 
            "alerts", 
            200, 
            params=params
        )
        if success and len(response) > 0:
            self.created_alerts.extend(response)
        return success, response

    def test_acknowledge_alert(self, alert_id):
        """Test acknowledging an alert"""
        return self.run_test(
            f"Acknowledge Alert: {alert_id}", 
            "PUT", 
            f"alerts/{alert_id}/acknowledge", 
            200
        )

    def test_get_dashboard_analytics(self, brand_id=None):
        """Test getting dashboard analytics"""
        params = {}
        if brand_id:
            params["brand_id"] = brand_id
        
        return self.run_test(
            f"Get Dashboard Analytics", 
            "GET", 
            "analytics/dashboard", 
            200, 
            params=params
        )

    def test_get_sentiment_trends(self, brand_id=None, days=7):
        """Test getting sentiment trends"""
        params = {"days": days}
        if brand_id:
            params["brand_id"] = brand_id
        
        return self.run_test(
            f"Get Sentiment Trends", 
            "GET", 
            "analytics/trends", 
            200, 
            params=params
        )

    def test_generate_sample_data(self):
        """Test generating sample data"""
        return self.run_test(
            "Generate Sample Data", 
            "POST", 
            "sample-data/generate", 
            200
        )

    def test_sentiment_analysis(self):
        """Test sentiment analysis with different types of comments"""
        if not self.created_brands:
            print("❌ No brands available for testing sentiment analysis")
            return False
        
        brand_id = self.created_brands[0]['id']
        
        # Test positive sentiment
        positive_comment = "I absolutely love this product! It's amazing and exceeded all my expectations."
        success_pos, response_pos = self.test_create_comment(
            brand_id, 
            "facebook", 
            positive_comment, 
            "Positive User"
        )
        
        # Test negative sentiment
        negative_comment = "This is terrible. I'm very disappointed with the quality and service."
        success_neg, response_neg = self.test_create_comment(
            brand_id, 
            "facebook", 
            negative_comment, 
            "Negative User"
        )
        
        # Test neutral sentiment
        neutral_comment = "The product arrived today. It's as described."
        success_neu, response_neu = self.test_create_comment(
            brand_id, 
            "facebook", 
            neutral_comment, 
            "Neutral User"
        )
        
        # Verify sentiment types
        if success_pos and success_neg and success_neu:
            print("\n📊 Sentiment Analysis Results:")
            print(f"Positive comment sentiment: {response_pos.get('sentiment_type', 'unknown')} (Score: {response_pos.get('sentiment_score', 'unknown')})")
            print(f"Negative comment sentiment: {response_neg.get('sentiment_type', 'unknown')} (Score: {response_neg.get('sentiment_score', 'unknown')})")
            print(f"Neutral comment sentiment: {response_neu.get('sentiment_type', 'unknown')} (Score: {response_neu.get('sentiment_score', 'unknown')})")
            
            # Check if sentiment types are as expected
            sentiment_correct = (
                response_pos.get('sentiment_type') == 'positive' and
                response_neg.get('sentiment_type') == 'negative' and
                response_neu.get('sentiment_type') == 'neutral'
            )
            
            if sentiment_correct:
                print("✅ Sentiment analysis is working correctly")
                return True
            else:
                print("❌ Sentiment analysis results are not as expected")
                return False
        else:
            print("❌ Failed to create test comments for sentiment analysis")
            return False

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://f1e9601b-a313-4893-b01b-85a239c3131a.preview.emergentagent.com/api"
    
    print(f"Testing ORM API at: {backend_url}")
    tester = ORMAPITester(backend_url)
    
    # Test root endpoint
    tester.test_root_endpoint()
    
    # Generate sample data
    tester.test_generate_sample_data()
    
    # Test brand management
    success, brands = tester.test_get_brands()
    if success and len(brands) > 0:
        print(f"Found {len(brands)} brands")
        brand_id = brands[0]['id']
        
        # Test getting a specific brand
        tester.test_get_brand(brand_id)
        
        # Test updating a brand
        tester.test_update_brand(brand_id, f"{brands[0]['name']} Updated")
        
        # Test creating a new brand
        tester.test_create_brand(f"Test Brand {datetime.now().strftime('%H%M%S')}")
    else:
        # Create a test brand if none exist
        tester.test_create_brand("Test Brand")
    
    # Refresh brands list
    success, brands = tester.test_get_brands()
    if success and len(brands) > 0:
        brand_id = brands[0]['id']
        
        # Test comments
        tester.test_create_comment(brand_id, "facebook", "This is a test comment. I like it!", "Test User")
        tester.test_create_comment(brand_id, "instagram", "This is terrible service!", "Angry User")
        
        success, comments = tester.test_get_comments(brand_id=brand_id)
        if success and len(comments) > 0:
            # Test marking a comment as responded
            tester.test_mark_comment_responded(comments[0]['id'])
            
            # Test filtered comments
            tester.test_get_comments(brand_id=brand_id, platform="facebook")
            tester.test_get_comments(brand_id=brand_id, sentiment_type="negative")
            tester.test_get_comments(brand_id=brand_id, needs_response=True)
        
        # Test mentions
        tester.test_create_mention(
            brand_id, 
            "facebook", 
            "Mentioning this brand in my review", 
            "Reviewer", 
            "https://example.com/post/123"
        )
        
        tester.test_get_mentions(brand_id=brand_id)
        tester.test_get_mentions(brand_id=brand_id, platform="facebook")
        
        # Test alerts
        success, alerts = tester.test_get_alerts(brand_id=brand_id)
        if success and len(alerts) > 0:
            # Test acknowledging an alert
            tester.test_acknowledge_alert(alerts[0]['id'])
        
        # Test analytics
        tester.test_get_dashboard_analytics(brand_id=brand_id)
        tester.test_get_sentiment_trends(brand_id=brand_id)
    
    # Test sentiment analysis
    tester.test_sentiment_analysis()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
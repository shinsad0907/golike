from datetime import datetime, timezone
import base64
import os
import json
import supabase

class Check_key:
    def __init__(self):
                
        base_url = "https://cgogqyorfzpxaiotscfp.supabase.co"
        token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnb2dxeW9yZnpweGFpb3RzY2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5ODMyMzcsImV4cCI6MjA2MzU1OTIzN30.enehR9wGHJf1xKO7d4XBbmjfdm80EvBKzaaPO3NPVAM'
        supabase_client = supabase.create_client(base_url, token)
        self.res = supabase_client.table("Golike").select("*").execute()
    
    def check_update(self, key):
        for data in self.res.data:
            if data['id'] == key:
                datetime_key = data['created_at']
                target_time = datetime.strptime(datetime_key, "%Y-%m-%d")
                now = datetime.now()

                # nếu hiện tại nhỏ hơn ngày hết hạn thì key vẫn còn hạn
                if now < target_time:
                    print(f"✅ Key còn hạn đến {target_time}")
                    return {'data': True}
                else:
                    print(f"❌ Key đã hết hạn ({target_time})")
                    return {'data': False, 'status': 'Key đã hết hạn'}

        return {'data': False, 'status': 'Key không đúng'}

# Check_key().checK_update()
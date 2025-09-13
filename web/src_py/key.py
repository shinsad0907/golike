from datetime import datetime
import base64
import os
import json
import supabase

class Check_key:
    def __init__(self):
                
        base_url = "https://cgogqyorfzpxaiotscfp.supabase.co"
        token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnb2dxeW9yZnpweGFpb3RzY2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5ODMyMzcsImV4cCI6MjA2MzU1OTIzN30.enehR9wGHJf1xKO7d4XBbmjfdm80EvBKzaaPO3NPVAM'
        supabase_client = supabase.create_client(base_url, token)
        self.res = supabase_client.table("PRODUCTS").select("*").execute()
    def checK_update(self):
        for data in self.res.data:
            print(data['id'])
            if data['id'] == 3:
                if data['update'] == True:
                    return False
                else:
                    return True
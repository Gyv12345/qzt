#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:3456"

def test_follow_record_api():
    # 1. 获取登录令牌
    print("=== 测试登录 ===")
    login_response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin",
        "password": "123456"
    })

    if login_response.status_code != 200:
        print("登录失败")
        return

    token = login_response.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"登录成功，获取到令牌")

    # 2. 获取客户列表
    print("\n=== 获取客户列表 ===")
    customers_response = requests.get(f"{BASE_URL}/customers", headers=headers)
    if customers_response.status_code != 200:
        print("获取客户列表失败")
        return

    customers = customers_response.json()["data"]
    if not customers:
        print("没有找到客户，需要先创建客户")
        return

    customer_id = customers[0]["id"]
    print(f"使用客户ID: {customer_id}")

    # 3. 创建跟进记录
    print("\n=== 创建跟进记录 ===")
    follow_record_data = {
        "customerId": customer_id,
        "type": 1,
        "content": "电话沟通客户需求",
        "nextTime": "2024-12-31T18:00:00.000Z"
    }

    create_response = requests.post(f"{BASE_URL}/follow-records", json=follow_record_data, headers=headers)
    if create_response.status_code != 200:
        print(f"创建跟进记录失败: {create_response.text}")
        return

    created_record = create_response.json()["data"]
    record_id = created_record["id"]
    print(f"创建跟进记录成功，ID: {record_id}")

    # 4. 获取客户的跟进记录
    print("\n=== 获取客户的跟进记录 ===")
    get_records_response = requests.get(f"{BASE_URL}/follow-records/customer/{customer_id}", headers=headers)
    if get_records_response.status_code != 200:
        print(f"获取跟进记录失败: {get_records_response.text}")
        return

    records = get_records_response.json()["data"]
    print(f"获取到 {len(records)} 条跟进记录")

    # 5. 删除跟进记录
    print("\n=== 删除跟进记录 ===")
    delete_response = requests.delete(f"{BASE_URL}/follow-records/{record_id}", headers=headers)
    if delete_response.status_code != 200:
        print(f"删除跟进记录失败: {delete_response.text}")
        return

    print("删除跟进记录成功")

if __name__ == "__main__":
    # 等待服务启动
    print("等待服务启动...")
    time.sleep(2)

    test_follow_record_api()
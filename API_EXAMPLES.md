# API Examples

Bu faylda barcha API endpointlarining ishlatish misollari keltirilgan.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

### 1. Register (Ro'yxatdan o'tish)

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "centerId": "center-uuid-here"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "centerId": "center-uuid"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login (Kirish)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### 3. Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

### 4. Get Current User

```bash
curl -X POST http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

## Users

### 1. Get All Users

```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Get User by ID

```bash
curl -X GET http://localhost:3000/api/v1/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Create User

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "username": "newuser",
    "firstName": "New",
    "lastName": "User",
    "centerId": "center-uuid-here"
  }'
```

### 4. Update User

```bash
curl -X PATCH http://localhost:3000/api/v1/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }'
```

### 5. Delete User

```bash
curl -X DELETE http://localhost:3000/api/v1/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Assign Role to User

```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "role-uuid-here"
  }'
```

### 7. Remove Role from User

```bash
curl -X DELETE http://localhost:3000/api/v1/users/USER_ID/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Roles

### 1. Get All Roles

```bash
curl -X GET http://localhost:3000/api/v1/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Get Role by ID

```bash
curl -X GET http://localhost:3000/api/v1/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Create Role

```bash
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manager",
    "slug": "manager",
    "description": "Manager role with specific permissions",
    "centerId": "center-uuid-here"
  }'
```

### 4. Update Role

```bash
curl -X PATCH http://localhost:3000/api/v1/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Manager",
    "description": "Updated description"
  }'
```

### 5. Delete Role

```bash
curl -X DELETE http://localhost:3000/api/v1/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Assign Permission to Role

```bash
curl -X POST http://localhost:3000/api/v1/roles/ROLE_ID/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionId": "permission-uuid-here"
  }'
```

### 7. Remove Permission from Role

```bash
curl -X DELETE http://localhost:3000/api/v1/roles/ROLE_ID/permissions/PERMISSION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Permissions

### 1. Get All Permissions

```bash
curl -X GET http://localhost:3000/api/v1/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Get Permissions by Module

```bash
curl -X GET "http://localhost:3000/api/v1/permissions?module=user" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Seed Default Permissions

```bash
curl -X GET http://localhost:3000/api/v1/permissions/seed \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Get Permission by ID

```bash
curl -X GET http://localhost:3000/api/v1/permissions/PERMISSION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Create Permission

```bash
curl -X POST http://localhost:3000/api/v1/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Export Data",
    "slug": "data.export",
    "description": "Export data to CSV",
    "module": "data",
    "action": "export"
  }'
```

### 6. Update Permission

```bash
curl -X PATCH http://localhost:3000/api/v1/permissions/PERMISSION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'
```

### 7. Delete Permission

```bash
curl -X DELETE http://localhost:3000/api/v1/permissions/PERMISSION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Centers (Tenants)

### 1. Get All Centers

```bash
curl -X GET http://localhost:3000/api/v1/centers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Get Center by ID

```bash
curl -X GET http://localhost:3000/api/v1/centers/CENTER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Get Center Stats

```bash
curl -X GET http://localhost:3000/api/v1/centers/CENTER_ID/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Create Center

```bash
curl -X POST http://localhost:3000/api/v1/centers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Center",
    "slug": "new-center",
    "description": "A new center for testing",
    "isActive": true
  }'
```

### 5. Update Center

```bash
curl -X PATCH http://localhost:3000/api/v1/centers/CENTER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Center Name"
  }'
```

### 6. Delete Center

```bash
curl -X DELETE http://localhost:3000/api/v1/centers/CENTER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Telegram

### 1. Webhook (Public - No Auth Required)

```bash
curl -X POST http://localhost:3000/api/v1/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123456789,
    "message": {
      "message_id": 1,
      "from": {
        "id": 123456789,
        "is_bot": false,
        "first_name": "John",
        "username": "johndoe"
      },
      "chat": {
        "id": 123456789,
        "type": "private"
      },
      "text": "/start"
    }
  }'
```

### 2. Set Webhook URL

```bash
curl -X POST http://localhost:3000/api/v1/telegram/webhook/set \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/v1/telegram/webhook"
  }'
```

### 3. Get Webhook Info

```bash
curl -X GET http://localhost:3000/api/v1/telegram/webhook/info \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Send Message

```bash
curl -X POST http://localhost:3000/api/v1/telegram/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "123456789",
    "text": "Hello from API!",
    "options": {
      "parse_mode": "Markdown"
    }
  }'
```

### 5. Get All Telegram Users

```bash
curl -X GET http://localhost:3000/api/v1/telegram/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Get Telegram User by ID

```bash
curl -X GET http://localhost:3000/api/v1/telegram/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Get Telegram User by Telegram ID

```bash
curl -X GET http://localhost:3000/api/v1/telegram/users/telegram/123456789 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Complete Workflow Example

### 1. Seed Database

```bash
yarn prisma:seed
```

### 2. Login as Admin

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

Save the `accessToken` from response.

### 3. Create a New Center

```bash
curl -X POST http://localhost:3000/api/v1/centers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "slug": "my-company",
    "description": "My company center"
  }'
```

Save the `id` from response.

### 4. Create a New Role

```bash
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Employee",
    "slug": "employee",
    "description": "Regular employee",
    "centerId": "CENTER_ID_FROM_STEP_3"
  }'
```

### 5. Assign Permissions to Role

```bash
# Get all permissions first
curl -X GET http://localhost:3000/api/v1/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Assign permission
curl -X POST http://localhost:3000/api/v1/roles/ROLE_ID/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionId": "PERMISSION_ID"
  }'
```

### 6. Create a New User

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@company.com",
    "password": "password123",
    "username": "employee",
    "firstName": "John",
    "lastName": "Employee",
    "centerId": "CENTER_ID_FROM_STEP_3"
  }'
```

### 7. Assign Role to User

```bash
curl -X POST http://localhost:3000/api/v1/users/USER_ID/roles \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "ROLE_ID_FROM_STEP_4"
  }'
```

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

## Postman Collection

Postman collection'ni import qilish uchun quyidagi JSON'ni ishlatishingiz mumkin yoki yuqoridagi curl commandlarini Postman'ga import qilishingiz mumkin.

**Tip:** Postman'da environment o'rnatib, `baseUrl` va `accessToken` o'zgaruvchilarini saqlang.


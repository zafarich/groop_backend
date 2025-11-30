# Payment Card API Documentation

This module manages payment cards for education centers. It allows creating, updating, listing, and deleting payment cards.

## Base URL

`/payment-cards`

## Authentication

Most endpoints require a valid JWT token.
Headers: `Authorization: Bearer <token>`

## Permissions

- `center.manage`: Required for creating, updating, deleting, and managing cards.
- `center.read`: Required for viewing card details (admin/internal).
- Public endpoints do not require permissions.

---

## Endpoints

### 1. Create Payment Card

Create a new payment card for a center.

- **Method:** `POST`
- **URL:** `/payment-cards`
- **Permission:** `center.manage`
- **Body:** `CreatePaymentCardDto`

```json
{
  "centerId": 1, // Required (Integer)
  "cardNumber": "8600 ...", // Required (String, 10-30 chars)
  "cardHolder": "COMPANY LLC", // Required (String, 3-100 chars)
  "bankName": "Uzcard", // Optional (String)
  "cardType": "uzcard", // Optional (Enum: 'uzcard', 'humo', 'visa', 'mastercard', 'other')
  "isActive": true, // Optional (Boolean)
  "isVisible": true, // Optional (Boolean)
  "isPrimary": false, // Optional (Boolean)
  "description": "Main card", // Optional (String)
  "displayOrder": 0 // Optional (Integer)
}
```

### 2. Get All Payment Cards (Admin/Internal)

Get all payment cards for the active center.

- **Method:** `GET`
- **URL:** `/payment-cards`
- **Permission:** `center.read`
- **Query Params:**
  - `includeHidden` (boolean, optional): If `true`, includes hidden cards. Default `false`.

### 3. Get Visible Payment Cards (Public)

Get all visible and active payment cards for a specific center. Useful for public pages (e.g., checkout).

- **Method:** `GET`
- **URL:** `/payment-cards/visible/:centerId`
- **Access:** Public

### 4. Get Primary Payment Card (Public)

Get the primary payment card for a center. If no primary card exists, returns the first visible active card.

- **Method:** `GET`
- **URL:** `/payment-cards/primary/:centerId`
- **Access:** Public

### 5. Get Single Payment Card

Get details of a specific payment card.

- **Method:** `GET`
- **URL:** `/payment-cards/:id`
- **Permission:** `center.read`

### 6. Update Payment Card

Update an existing payment card.

- **Method:** `PATCH`
- **URL:** `/payment-cards/:id`
- **Permission:** `center.manage`
- **Body:** `UpdatePaymentCardDto` (Partial of CreatePaymentCardDto)

```json
{
  "cardHolder": "NEW NAME",
  "isPrimary": true
}
```

### 7. Set Primary Card

Set a specific card as the primary card for the center. This will unset any other primary card.

- **Method:** `PATCH`
- **URL:** `/payment-cards/:id/set-primary`
- **Permission:** `center.manage`

### 8. Toggle Visibility

Toggle the `isVisible` status of a card.

- **Method:** `PATCH`
- **URL:** `/payment-cards/:id/toggle-visibility`
- **Permission:** `center.manage`

### 9. Soft Delete

Soft delete a card (sets `isVisible` to `false` and `isPrimary` to `false`).

- **Method:** `DELETE`
- **URL:** `/payment-cards/:id/soft`
- **Permission:** `center.manage`

### 10. Hard Delete

Permanently remove a card from the database.

- **Method:** `DELETE`
- **URL:** `/payment-cards/:id`
- **Permission:** `center.manage`

### 11. Reorder Cards

Update the display order of cards.

- **Method:** `POST`
- **URL:** `/payment-cards/reorder`
- **Permission:** `center.manage`
- **Body:**

```json
{
  "cardIds": [3, 1, 2] // Array of card IDs in the desired order
}
```

---

## TypeScript Interfaces

```typescript
export interface CreatePaymentCardDto {
  centerId: number;
  cardNumber: string;
  cardHolder: string;
  bankName?: string;
  cardType?: 'uzcard' | 'humo' | 'visa' | 'mastercard' | 'other';
  isActive?: boolean;
  isVisible?: boolean;
  isPrimary?: boolean;
  description?: string;
  displayOrder?: number;
}

export interface UpdatePaymentCardDto extends Partial<CreatePaymentCardDto> {}

export interface PaymentCard {
  id: number;
  centerId: number;
  cardNumber: string;
  cardHolder: string;
  bankName?: string;
  cardType?: string;
  isActive: boolean;
  isVisible: boolean;
  isPrimary: boolean;
  description?: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}
```

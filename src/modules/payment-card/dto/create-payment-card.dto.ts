import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsUUID,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';

export class CreatePaymentCardDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(30)
  cardNumber: string; // Masalan: "8600 1234 5678 9012"

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  cardHolder: string; // Masalan: "FALCON ACADEMY LLC"

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankName?: string; // Masalan: "Uzcard", "Humo", "Visa"

  @IsString()
  @IsOptional()
  @IsIn(['uzcard', 'humo', 'visa', 'mastercard', 'other'])
  cardType?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

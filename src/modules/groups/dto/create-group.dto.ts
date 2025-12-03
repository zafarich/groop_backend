import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  ValidateIf,
  ArrayMinSize,
  Min,
  Max,
  Matches,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '@prisma/client';

// Custom validator for time comparison
function IsAfterTime(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterTime',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          if (!value || !relatedValue) return true;

          // Compare times in HH:MM format
          const [endHour, endMin] = value.split(':').map(Number);
          const [startHour, startMin] = relatedValue.split(':').map(Number);

          const endMinutes = endHour * 60 + endMin;
          const startMinutes = startHour * 60 + startMin;

          return endMinutes > startMinutes;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be after ${args.constraints[0]}`;
        },
      },
    });
  };
}

// Nested DTO for teacher assignment
export class TeacherAssignmentDto {
  @IsNumber()
  @IsNotEmpty()
  teacherId: number;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

// Nested DTO for lesson schedule
export class LessonScheduleDto {
  @IsNumber()
  @Min(1, { message: 'Day of week must be between 1 (Monday) and 7 (Sunday)' })
  @Max(7, { message: 'Day of week must be between 1 (Monday) and 7 (Sunday)' })
  dayOfWeek: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:MM format (24-hour)',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:MM format (24-hour)',
  })
  @IsAfterTime('startTime', {
    message: 'End time must be after start time',
  })
  endTime: string;
}

// Nested DTO for group discount
export class GroupDiscountDto {
  @IsNumber()
  @Min(2, { message: 'Discount months must be at least 2' })
  months: number;

  @IsNumber()
  @Min(0, { message: 'Discount amount must be non-negative' })
  discountAmount: number;
}

// Main DTO for creating a group
export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0, { message: 'Monthly price must be non-negative' })
  monthlyPrice: number;

  @IsDateString()
  @IsNotEmpty()
  courseStartDate: Date;

  @IsDateString()
  @IsNotEmpty()
  courseEndDate: Date;

  @IsEnum(PaymentType, {
    message:
      'Payment type must be one of: START_TO_END_OF_MONTH, MONTHLY_SAME_DATE, LESSON_BASED',
  })
  @IsNotEmpty()
  paymentType: PaymentType;

  // Conditional: Required only if paymentType === 'LESSON_BASED'
  @ValidateIf((o) => o.paymentType === 'LESSON_BASED')
  @IsNumber()
  @Min(1, { message: 'Lessons per payment period must be at least 1' })
  @IsNotEmpty({
    message:
      'Lessons per payment period is required for LESSON_BASED payment type',
  })
  lessonsPerPaymentPeriod?: number;

  // Teachers (required, at least 1)
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one teacher is required' })
  @ValidateNested({ each: true })
  @Type(() => TeacherAssignmentDto)
  teachers: TeacherAssignmentDto[];

  // Lesson schedules (required, at least 1)
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one lesson schedule is required' })
  @ValidateNested({ each: true })
  @Type(() => LessonScheduleDto)
  lessonSchedules: LessonScheduleDto[];

  // Discounts (optional)
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GroupDiscountDto)
  discounts?: GroupDiscountDto[];
}

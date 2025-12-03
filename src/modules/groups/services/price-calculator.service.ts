import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PriceCalculatorService {
  private readonly logger = new Logger(PriceCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate the total price for a multi-month payment
   * @param groupId - The group ID
   * @param months - Number of months to pay for
   * @param individualDiscountAmount - Optional individual student discount (per month)
   * @returns Total price after applying group and individual discounts
   */
  async calculateMonthlyPrice(
    groupId: number,
    months: number,
    individualDiscountAmount: Decimal | number = 0,
  ): Promise<{ totalPrice: Decimal; breakdown: any }> {
    // Get group with discounts
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        groupDiscounts: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            months: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const baseMonthlyPrice = new Decimal(group.monthlyPrice);
    const individualDiscount = new Decimal(individualDiscountAmount);

    // Calculate base price for all months
    let totalPrice = baseMonthlyPrice.mul(months);

    // Apply individual discount (per month)
    if (individualDiscount.gt(0)) {
      const totalIndividualDiscount = individualDiscount.mul(months);
      totalPrice = totalPrice.sub(totalIndividualDiscount);
    }

    // Apply group discount if available for this number of months
    let groupDiscountAmount = new Decimal(0);
    const applicableDiscount = group.groupDiscounts.find(
      (d) => d.months === months,
    );

    if (applicableDiscount) {
      groupDiscountAmount = new Decimal(applicableDiscount.discountAmount);
      totalPrice = totalPrice.sub(groupDiscountAmount);
    }

    // Ensure price doesn't go negative
    if (totalPrice.lt(0)) {
      totalPrice = new Decimal(0);
    }

    const breakdown = {
      baseMonthlyPrice: baseMonthlyPrice.toNumber(),
      months,
      subtotal: baseMonthlyPrice.mul(months).toNumber(),
      individualDiscountPerMonth: individualDiscount.toNumber(),
      totalIndividualDiscount: individualDiscount.mul(months).toNumber(),
      groupDiscountAmount: groupDiscountAmount.toNumber(),
      totalPrice: totalPrice.toNumber(),
    };

    this.logger.debug(
      `Price calculation for group ${groupId}, ${months} months: ${JSON.stringify(breakdown)}`,
    );

    return {
      totalPrice,
      breakdown,
    };
  }

  /**
   * Get available payment options (months) for a group
   * @param groupId - The group ID
   * @returns Array of available payment options with prices
   */
  async getPaymentOptions(
    groupId: number,
    individualDiscountAmount: Decimal | number = 0,
  ): Promise<
    Array<{
      months: number;
      totalPrice: number;
      discountAmount: number;
      pricePerMonth: number;
    }>
  > {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        groupDiscounts: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            months: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const options: Array<{
      months: number;
      totalPrice: number;
      discountAmount: number;
      pricePerMonth: number;
    }> = [];

    // Always include single month option
    const singleMonthResult = await this.calculateMonthlyPrice(
      groupId,
      1,
      individualDiscountAmount,
    );
    options.push({
      months: 1,
      totalPrice: singleMonthResult.totalPrice.toNumber(),
      discountAmount: 0,
      pricePerMonth: singleMonthResult.totalPrice.toNumber(),
    });

    // Add multi-month options
    for (const discount of group.groupDiscounts) {
      const result = await this.calculateMonthlyPrice(
        groupId,
        discount.months,
        individualDiscountAmount,
      );
      options.push({
        months: discount.months,
        totalPrice: result.totalPrice.toNumber(),
        discountAmount: new Decimal(discount.discountAmount).toNumber(),
        pricePerMonth: result.totalPrice.div(discount.months).toNumber(),
      });
    }

    return options;
  }

  /**
   * Calculate per-lesson price
   * @param monthlyPrice - Monthly price
   * @param lessonsPerMonth - Number of lessons per month
   * @returns Per-lesson price
   */
  calculatePerLessonPrice(
    monthlyPrice: Decimal | number,
    lessonsPerMonth: number,
  ): Decimal {
    if (lessonsPerMonth <= 0) {
      throw new Error('Lessons per month must be greater than 0');
    }

    const price = new Decimal(monthlyPrice);
    return price.div(lessonsPerMonth);
  }

  /**
   * Apply group discounts only (without individual discount)
   * @param basePrice - Base price
   * @param months - Number of months
   * @param groupDiscounts - Array of group discounts
   * @returns Price after group discount
   */
  applyGroupDiscounts(
    basePrice: Decimal | number,
    months: number,
    groupDiscounts: Array<{ months: number; discountAmount: Decimal | number }>,
  ): Decimal {
    let totalPrice = new Decimal(basePrice).mul(months);

    const applicableDiscount = groupDiscounts.find((d) => d.months === months);
    if (applicableDiscount) {
      const discountAmount = new Decimal(applicableDiscount.discountAmount);
      totalPrice = totalPrice.sub(discountAmount);
    }

    // Ensure price doesn't go negative
    if (totalPrice.lt(0)) {
      totalPrice = new Decimal(0);
    }

    return totalPrice;
  }

  /**
   * Apply individual discount
   * @param price - Base price
   * @param individualDiscountAmount - Discount amount per month
   * @param months - Number of months
   * @returns Price after individual discount
   */
  applyIndividualDiscount(
    price: Decimal | number,
    individualDiscountAmount: Decimal | number,
    months: number = 1,
  ): Decimal {
    const basePrice = new Decimal(price);
    const discount = new Decimal(individualDiscountAmount);
    const totalDiscount = discount.mul(months);

    let finalPrice = basePrice.sub(totalDiscount);

    // Ensure price doesn't go negative
    if (finalPrice.lt(0)) {
      finalPrice = new Decimal(0);
    }

    return finalPrice;
  }
}

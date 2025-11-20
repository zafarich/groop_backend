import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePaymentCardDto, UpdatePaymentCardDto } from './dto';

@Injectable()
export class PaymentCardService {
  private readonly logger = new Logger(PaymentCardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new payment card for a center
   */
  async create(createPaymentCardDto: CreatePaymentCardDto) {
    const { centerId, isPrimary, ...rest } = createPaymentCardDto;

    // Verify center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    // If this card is marked as primary, unset other primary cards
    if (isPrimary) {
      await this.prisma.centerPaymentCard.updateMany({
        where: {
          centerId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // Create the payment card
    const paymentCard = await this.prisma.centerPaymentCard.create({
      data: {
        centerId,
        isPrimary,
        ...rest,
      },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(`Payment card created for center ${centerId}`);
    return paymentCard;
  }

  /**
   * Get all payment cards (optionally filtered by centerId)
   */
  async findAll(centerId?: number, includeHidden = false) {
    const where: any = {};

    if (centerId) {
      where.centerId = centerId;
    }

    if (!includeHidden) {
      where.isVisible = true;
    }

    return this.prisma.centerPaymentCard.findMany({
      where,
      include: {
        center: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get visible payment cards for a center (for public use)
   */
  async findVisibleByCenter(centerId: number) {
    return this.prisma.centerPaymentCard.findMany({
      where: {
        centerId,
        isVisible: true,
        isActive: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        cardNumber: true,
        cardHolder: true,
        bankName: true,
        cardType: true,
        description: true,
        isPrimary: true,
        displayOrder: true,
      },
    });
  }

  /**
   * Get primary payment card for a center
   */
  async findPrimaryByCenter(centerId: number) {
    const primaryCard = await this.prisma.centerPaymentCard.findFirst({
      where: {
        centerId,
        isPrimary: true,
        isVisible: true,
        isActive: true,
      },
      select: {
        id: true,
        cardNumber: true,
        cardHolder: true,
        bankName: true,
        cardType: true,
        description: true,
      },
    });

    if (!primaryCard) {
      // If no primary card, return the first visible active card
      return this.prisma.centerPaymentCard.findFirst({
        where: {
          centerId,
          isVisible: true,
          isActive: true,
        },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          cardNumber: true,
          cardHolder: true,
          bankName: true,
          cardType: true,
          description: true,
        },
      });
    }

    return primaryCard;
  }

  /**
   * Get a single payment card by ID
   */
  async findOne(id: number) {
    const paymentCard = await this.prisma.centerPaymentCard.findUnique({
      where: { id },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!paymentCard) {
      throw new NotFoundException('Payment card not found');
    }

    return paymentCard;
  }

  /**
   * Update a payment card
   */
  async update(id: number, updatePaymentCardDto: UpdatePaymentCardDto) {
    const paymentCard = await this.prisma.centerPaymentCard.findUnique({
      where: { id },
    });

    if (!paymentCard) {
      throw new NotFoundException('Payment card not found');
    }

    const { isPrimary, centerId, ...rest } = updatePaymentCardDto;

    // If setting as primary, unset other primary cards in the same center
    if (isPrimary && !paymentCard.isPrimary) {
      await this.prisma.centerPaymentCard.updateMany({
        where: {
          centerId: paymentCard.centerId,
          isPrimary: true,
          id: { not: id },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return this.prisma.centerPaymentCard.update({
      where: { id },
      data: {
        isPrimary,
        ...rest,
      },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete - set isVisible to false
   */
  async softDelete(id: number) {
    const paymentCard = await this.prisma.centerPaymentCard.findUnique({
      where: { id },
    });

    if (!paymentCard) {
      throw new NotFoundException('Payment card not found');
    }

    // If this is the primary card, we need to handle it carefully
    if (paymentCard.isPrimary) {
      // Find another visible card to make primary
      const anotherCard = await this.prisma.centerPaymentCard.findFirst({
        where: {
          centerId: paymentCard.centerId,
          id: { not: id },
          isVisible: true,
          isActive: true,
        },
        orderBy: { displayOrder: 'asc' },
      });

      if (anotherCard) {
        await this.prisma.centerPaymentCard.update({
          where: { id: anotherCard.id },
          data: { isPrimary: true },
        });
      }
    }

    return this.prisma.centerPaymentCard.update({
      where: { id },
      data: {
        isVisible: false,
        isPrimary: false,
      },
    });
  }

  /**
   * Hard delete - permanently remove from database
   */
  async remove(id: number) {
    const paymentCard = await this.prisma.centerPaymentCard.findUnique({
      where: { id },
    });

    if (!paymentCard) {
      throw new NotFoundException('Payment card not found');
    }

    return this.prisma.centerPaymentCard.delete({
      where: { id },
    });
  }

  /**
   * Set a card as primary
   */
  async setPrimary(id: number) {
    const paymentCard = await this.prisma.centerPaymentCard.findUnique({
      where: { id },
    });

    if (!paymentCard) {
      throw new NotFoundException('Payment card not found');
    }

    // Unset other primary cards
    await this.prisma.centerPaymentCard.updateMany({
      where: {
        centerId: paymentCard.centerId,
        isPrimary: true,
        id: { not: id },
      },
      data: {
        isPrimary: false,
      },
    });

    // Set this card as primary
    return this.prisma.centerPaymentCard.update({
      where: { id },
      data: {
        isPrimary: true,
        isVisible: true,
        isActive: true,
      },
    });
  }

  /**
   * Toggle visibility
   */
  async toggleVisibility(id: number) {
    const paymentCard = await this.prisma.centerPaymentCard.findUnique({
      where: { id },
    });

    if (!paymentCard) {
      throw new NotFoundException('Payment card not found');
    }

    return this.prisma.centerPaymentCard.update({
      where: { id },
      data: {
        isVisible: !paymentCard.isVisible,
      },
    });
  }

  /**
   * Reorder cards
   */
  async reorder(centerId: number, cardIds: number[]) {
    const cards = await this.prisma.centerPaymentCard.findMany({
      where: {
        centerId,
        id: { in: cardIds },
      },
    });

    if (cards.length !== cardIds.length) {
      throw new BadRequestException('Invalid card IDs provided');
    }

    // Update display order
    const updates = cardIds.map((cardId, index) =>
      this.prisma.centerPaymentCard.update({
        where: { id: cardId },
        data: { displayOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true, message: 'Cards reordered successfully' };
  }
}


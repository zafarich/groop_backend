import { IsNotEmpty, IsOptional } from 'class-validator';

export class TelegramWebhookUpdateDto {
  @IsNotEmpty()
  update_id: number;

  @IsOptional()
  message?: any;

  @IsOptional()
  edited_message?: any;

  @IsOptional()
  channel_post?: any;

  @IsOptional()
  edited_channel_post?: any;

  @IsOptional()
  inline_query?: any;

  @IsOptional()
  chosen_inline_result?: any;

  @IsOptional()
  callback_query?: any;

  @IsOptional()
  shipping_query?: any;

  @IsOptional()
  pre_checkout_query?: any;

  @IsOptional()
  poll?: any;

  @IsOptional()
  poll_answer?: any;

  @IsOptional()
  my_chat_member?: any;

  @IsOptional()
  chat_member?: any;

  @IsOptional()
  chat_join_request?: any;
}

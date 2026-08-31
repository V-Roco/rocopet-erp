import { IsDateString } from 'class-validator';

export class QueryCalendarDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

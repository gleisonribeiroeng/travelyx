import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripAccessGuard, MinRole } from '../collaboration/collaboration.guard';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Controller('trips/:tripId/expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @UseGuards(TripAccessGuard)
  @MinRole('EDITOR')
  create(
    @Param('tripId') tripId: string,
    @Body() body: CreateExpenseDto,
    @Req() req: any,
  ) {
    return this.expensesService.create(tripId, req.user.sub, body);
  }

  @Get()
  @UseGuards(TripAccessGuard)
  @MinRole('VIEWER')
  getExpenses(@Param('tripId') tripId: string) {
    return this.expensesService.getByTrip(tripId);
  }

  @Get('balance')
  @UseGuards(TripAccessGuard)
  @MinRole('VIEWER')
  getBalance(@Param('tripId') tripId: string) {
    return this.expensesService.getBalance(tripId);
  }

  @Put(':expenseId/entries/:entryId/paid')
  @UseGuards(TripAccessGuard)
  @MinRole('EDITOR')
  togglePaid(
    @Param('entryId') entryId: string,
    @Req() req: any,
  ) {
    return this.expensesService.markEntryPaid(entryId, req.user.sub);
  }

  @Delete(':expenseId')
  @UseGuards(TripAccessGuard)
  @MinRole('EDITOR')
  remove(
    @Param('expenseId') expenseId: string,
    @Req() req: any,
  ) {
    return this.expensesService.remove(expenseId, req.user.sub);
  }
}

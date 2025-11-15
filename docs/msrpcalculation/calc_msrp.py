from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Product:
    base_msrp: float  # base msrp for one unit this product
    frequency: float  # frequency of this product


@dataclass
class MsrpSeasonPart:
    product: Product
    amount: float  # amount of units of this product
    months: int  # number of months of start of order until end of season
    weight: (
        float  # remaining amount of the product in the season when the msrp was calculated (0..1)
    )

    monthly_due_effective: float | None = None
    effective_months: int | None = None
    effective_weight: float | None = None
    overpay: float = 0

    def get_total_msrp(self) -> float:
        return self.product.base_msrp * self.product.frequency * self.amount

    def set_monthly_due_effective(self, amount: float):
        self.monthly_due_effective = amount

    def get_total_value_in_range(self) -> float:
        return self.get_total_msrp() * self.effective_weight

    def get_total_paid_in_range(self) -> float:
        return self.monthly_due_effective * self.effective_months

    def set_effective_months(self, months: int):
        self.effective_months = months

    def set_effective_weight(self, weight: float):
        self.effective_weight = weight

    def set_overpay(self, overpay: float):
        self.overpay = overpay


def calc_msrp(current_msrp: MsrpSeasonPart, new_msrp: MsrpSeasonPart):
    def already_paid_total(current_msrp: MsrpSeasonPart, new_msrp: MsrpSeasonPart) -> float:
        return current_msrp.msrp_eff * (current_msrp.months - new_msrp.months)

    def pay_eff_expected_total(current_msrp: MsrpSeasonPart, new_msrp: MsrpSeasonPart) -> float:
        duration_factor = (current_msrp.months - new_msrp.months) / current_msrp.months
        weight_factor = (current_msrp.weight - new_msrp.weight) / current_msrp.weight
        return (
            current_msrp.msrp_eff
            * weight_factor
            / duration_factor
            * (current_msrp.months - new_msrp.months)
        )

    def overpay_total(current_msrp: MsrpSeasonPart, new_msrp: MsrpSeasonPart) -> float:
        return already_paid_total(current_msrp, new_msrp) - pay_eff_expected_total(
            current_msrp, new_msrp
        )

    def new_pay_total(current_msrp: MsrpSeasonPart, new_msrp: MsrpSeasonPart) -> float:
        return new_msrp.msrp * current_msrp.months * new_msrp.weight

    def new_pay_eff_total(current_msrp: MsrpSeasonPart, new_msrp: MsrpSeasonPart) -> float:
        return new_pay_total(current_msrp, new_msrp) - overpay_total(current_msrp, new_msrp)

    def total_pay(current_msrp: MsrpSeasonPart, new_msrp: MsrpSeasonPart) -> float:
        return (
            current_msrp.msrp_eff * (current_msrp.months - new_msrp.months)
            + new_msrp.msrp_eff * new_msrp.months
        )

    print(f"already paid: {already_paid_total(current_msrp, new_msrp):.2f}")
    print(f"pay_eff_expected: {pay_eff_expected_total(current_msrp, new_msrp):.2f}")
    print(f"overpay: {overpay_total(current_msrp, new_msrp):.2f}")
    print(f"new_pay_total: {new_pay_total(current_msrp, new_msrp):.2f}")

    new_msrp.msrp_eff = new_pay_eff_total(current_msrp, new_msrp) / new_msrp.months
    print(f"new_pay_eff: {new_msrp.msrp_eff:.2f}")

    print(f"total pay: {total_pay(current_msrp, new_msrp):.2f}")


def calc_msrp_chain(chain: list[MsrpSeasonPart]):
    yearly_msrp = 0
    previous = None
    for i in range(len(chain)):
        current = chain[i]
        next = chain[i + 1] if i + 1 < len(chain) else None
        previous = chain[i - 1] if i - 1 >= 0 else None

        current.set_effective_months(current.months - (next.months if next else 0))
        current.set_effective_weight(current.weight - (next.weight if next else 0))

        print(f"\ncurrent: {current}")
        print(f"next:    {next}")

        # calculate product value for current range
        yearly_msrp += current.get_total_value_in_range()
        print(f"--> yearly_msrp: {yearly_msrp:.2f}")

    previous = None
    for i in range(len(chain)):
        current = chain[i]
        next = chain[i + 1] if i + 1 < len(chain) else None
        previous = chain[i - 1] if i - 1 >= 0 else None

        print(f"\ncurrent: {current}")
        print(f"next:    {next}")

        # calculate paid value for current range
        # next_months = chain.next.current.months if chain.next else 0
        remaining_value = current.get_total_msrp() * current.weight
        monthly_due = remaining_value / current.months

        previous_overpay = 0
        if previous:
            previous_overpay = (
                previous.monthly_due_effective * (previous.months - current.months)
                - previous.get_total_value_in_range()
            )
            previous.set_overpay(previous_overpay)

        current.set_monthly_due_effective(monthly_due - previous_overpay / current.months)

        print(f"--> remaining_value: {remaining_value:.2f}")
        print(f"--> monthly_due: {monthly_due:.2f}")
        print(f"--> previous_overpay: {previous_overpay:.2f}")
        print(f"--> monthly_due_effective: {current.monthly_due_effective:.2f}")

        # paid_at_end_of_season = current.monthly_due_effective * current.months

    print(f"\n------\nyearly_msrp: {yearly_msrp:.2f}")

    last_month = 0
    cumulative_sum = 0
    for part in chain:
        for __ in range(part.effective_months):
            cumulative_sum += part.monthly_due_effective
            print(
                f"month {last_month+1:02d}: {part.monthly_due_effective:.2f} (cumulative: {cumulative_sum:.2f})"
            )
            last_month += 1


if __name__ == "__main__":

    product = Product(base_msrp=100, frequency=12)

    # months = 4
    # for weight in [months / 12, 0.5, 0.6]:
    #     print(f"\n{weight=}, {months=}")
    #     current_msrp = MsrpSeasonPart(msrp=None, msrp_eff=100, months=12, weight=1)
    #     new_msrp = MsrpSeasonPart(msrp=100, msrp_eff=None, months=months, weight=weight)
    #     print(f"current_msrp: {current_msrp}")
    #     print(f"new_msrp: {new_msrp}")
    #     calc_msrp(current_msrp, new_msrp)

    # more than one change
    chain = [
        MsrpSeasonPart(product=product, amount=1, months=12, weight=1),
        MsrpSeasonPart(product=product, amount=1, months=6, weight=0.7),
        MsrpSeasonPart(product=product, amount=1, months=3, weight=0.2),
    ]
    # chain = MsrpChain(
    #     current=changes[0],
    #     next=MsrpChain(current=changes[1], next=MsrpChain(current=changes[2], next=None)),
    # )

    print("\n\nmore than one change")
    print(f"chain: {chain}")
    calc_msrp_chain(chain)

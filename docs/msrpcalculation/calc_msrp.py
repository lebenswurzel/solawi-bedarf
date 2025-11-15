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


def calc_msrp_chain(chain: list[MsrpSeasonPart]):
    yearly_msrp = 0
    yearly_msrps = [0]
    for i in range(len(chain)):
        current = chain[i]
        next = chain[i + 1] if i + 1 < len(chain) else None

        current.set_effective_months(current.months - (next.months if next else 0))
        current.set_effective_weight(current.weight - (next.weight if next else 0))

        print(f"\ncurrent: {current}")
        print(f"next:    {next}")

        # calculate product value for current range
        yearly_msrp += current.get_total_value_in_range()
        yearly_msrps.append(yearly_msrp)
        print(f"--> yearly_msrp: {yearly_msrp:.2f}")

    cumulative_paid = 0
    for i in range(len(chain)):
        current = chain[i]
        next = chain[i + 1] if i + 1 < len(chain) else None

        print(f"\ncurrent: {current}")
        print(f"next:    {next}")

        # calculate paid value for current range
        # next_months = chain.next.current.months if chain.next else 0
        remaining_value = current.get_total_msrp() * current.weight
        monthly_due = remaining_value / current.months

        relevant_yearly_msrp = yearly_msrps[i] + remaining_value

        current.set_monthly_due_effective((relevant_yearly_msrp - cumulative_paid) / current.months)
        cumulative_paid += current.get_total_paid_in_range()

        print(f"--> remaining_value: {remaining_value:.2f}")
        print(f"--> monthly_due: {monthly_due:.2f}")
        print(f"--> cumulative_paid: {cumulative_paid:.2f}")
        print(f"--> monthly_due_effective: {current.monthly_due_effective:.2f}")

        # paid_at_end_of_season = current.monthly_due_effective * current.months

    print(f"\n------\nyearly_msrp: {yearly_msrp:.2f}")

    last_month = 0
    cumulative_sum = 0
    for i, part in enumerate(chain):
        for __ in range(part.effective_months):
            cumulative_sum += part.monthly_due_effective
            print(
                f"{i+1:02d} - month {last_month+1:02d}: {part.monthly_due_effective:.2f} (cumulative: {cumulative_sum:.2f})"
            )
            last_month += 1

    assert round(cumulative_sum, 2) == round(yearly_msrp, 2)


if __name__ == "__main__":

    product = Product(base_msrp=100, frequency=12)

    # more than one change
    chain = [
        MsrpSeasonPart(product=product, amount=1, months=12, weight=1),
        MsrpSeasonPart(product=product, amount=1, months=7, weight=0.7),
        MsrpSeasonPart(product=product, amount=2, months=5, weight=0.2),
        MsrpSeasonPart(product=product, amount=0, months=4, weight=0.1),
    ]

    print("\n\nmore than one change")
    print(f"chain: {chain}")
    calc_msrp_chain(chain)

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

    def get_total_msrp(self) -> float:
        # value of the product if delivered in full amount
        return self.product.base_msrp * self.product.frequency * self.amount

    def get_total_remaining_value(self) -> float:
        # value of the product if delivered until the end of the season
        return self.get_total_msrp() * self.weight

    def get_total_value_in_range(self) -> float:
        return self.get_total_msrp() * self.effective_weight

    def set_monthly_due_effective(self, amount: float):
        self.monthly_due_effective = amount

    def get_total_paid_in_range(self) -> float:
        return self.monthly_due_effective * self.effective_months

    def set_effective_months(self, months: int):
        self.effective_months = months

    def set_effective_weight(self, weight: float):
        self.effective_weight = weight


def calc_msrp_chain(chain: list[MsrpSeasonPart]):

    cumulative_yearly_msrp = 0
    cumulative_paid = 0
    for i in range(len(chain)):
        current = chain[i]
        next = chain[i + 1] if i + 1 < len(chain) else None

        current.set_effective_months(current.months - (next.months if next else 0))
        current.set_effective_weight(current.weight - (next.weight if next else 0))

        print(f"\ncurrent: {current}")
        print(f"next:    {next}")

        remaining_value = current.get_total_remaining_value()

        relevant_yearly_msrp = cumulative_yearly_msrp + remaining_value

        current.set_monthly_due_effective((relevant_yearly_msrp - cumulative_paid) / current.months)
        cumulative_paid += current.get_total_paid_in_range()

        cumulative_yearly_msrp += current.get_total_value_in_range()

        print(f"--> yearly_msrp: {cumulative_yearly_msrp:.2f}")
        print(f"--> remaining_value: {remaining_value:.2f}")
        print(f"--> cumulative_paid: {cumulative_paid:.2f}")
        print(f"--> monthly_due_effective: {current.monthly_due_effective:.2f}")

    print(f"\n------\nyearly_msrp: {cumulative_yearly_msrp:.2f}")

    last_month = 0
    cumulative_sum = 0
    for i, part in enumerate(chain):
        for __ in range(part.effective_months):
            cumulative_sum += part.monthly_due_effective
            print(
                f"{i+1:02d} - month {last_month+1:02d}: {part.monthly_due_effective:.2f} (cumulative: {cumulative_sum:.2f})"
            )
            last_month += 1

    assert round(cumulative_sum, 2) == round(cumulative_yearly_msrp, 2)


if __name__ == "__main__":

    product = Product(base_msrp=100, frequency=12)

    # more than one change
    chain = [
        MsrpSeasonPart(product=product, amount=1, months=12, weight=1),
        MsrpSeasonPart(product=product, amount=0.5, months=7, weight=0.7),
        MsrpSeasonPart(product=product, amount=4.5, months=5, weight=0.2),
        MsrpSeasonPart(product=product, amount=0, months=4, weight=0.1),
    ]

    print("\n\nmore than one change")
    print(f"chain: {chain}")

    for i in range(len(chain)):
        calc_msrp_chain(chain[: i + 1])

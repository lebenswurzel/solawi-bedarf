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
    msrp_eff: float | None  # effective msrp for this product
    months: int  # number of months of start of order until end of season
    weight: (
        float  # remaining amount of the product in the season when the msrp was calculated (0..1)
    )

    def get_total_msrp(self) -> float:
        return self.product.base_msrp * self.product.frequency * self.amount


@dataclass
class MsrpChain:
    current: MsrpSeasonPart
    next: "MsrpChain" | None = None


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


def calc_msrp(current_msrp: MsrpSeasonPart, new_msrp: MsrpSeasonPart):

    print(f"already paid: {already_paid_total(current_msrp, new_msrp):.2f}")
    print(f"pay_eff_expected: {pay_eff_expected_total(current_msrp, new_msrp):.2f}")
    print(f"overpay: {overpay_total(current_msrp, new_msrp):.2f}")
    print(f"new_pay_total: {new_pay_total(current_msrp, new_msrp):.2f}")

    new_msrp.msrp_eff = new_pay_eff_total(current_msrp, new_msrp) / new_msrp.months
    print(f"new_pay_eff: {new_msrp.msrp_eff:.2f}")

    print(f"total pay: {total_pay(current_msrp, new_msrp):.2f}")


def calc_msrp_chain(chain: MsrpChain):
    yearly_msrp = 0
    while True:
        print(f"current: {chain.current}")
        print(f"next: {chain.next.current if chain.next else None}")
        current = chain.current
        next_weight = chain.next.current.weight if chain.next else 0
        yearly_msrp += current.get_total_msrp() * (current.weight - next_weight)
        print(f"--> yearly_msrp: {yearly_msrp:.2f}")
        chain = chain.next
        if not chain:
            break
    print(f"yearly_msrp: {yearly_msrp:.2f}")


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
    changes = [
        MsrpSeasonPart(product=product, amount=1, msrp_eff=100, months=12, weight=1),
        MsrpSeasonPart(product=product, amount=1, msrp_eff=None, months=6, weight=0.8),
        MsrpSeasonPart(product=product, amount=0, msrp_eff=None, months=3, weight=0.2),
    ]
    chain = MsrpChain(
        current=changes[0],
        next=MsrpChain(current=changes[1], next=MsrpChain(current=changes[2], next=None)),
    )

    print("\n\nmore than one change")
    print(f"chain: {chain}")
    calc_msrp_chain(chain)

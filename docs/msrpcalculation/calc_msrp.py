from dataclasses import dataclass


@dataclass
class MsrpSeasonPart:
    msrp: float | None  # average monthly msrp for this product
    msrp_eff: float | None  # effective msrp for this product
    months: int  # number of months of start of order until end of season
    weight: (
        float  # remaining amount of the product in the season when the msrp was calculated (0..1)
    )


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
        return new_msrp.msrp * 12 * new_msrp.weight

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


if __name__ == "__main__":

    months = 4
    for weight in [months / 12, 0.5, 0.6]:
        print(f"\n{weight=}, {months=}")
        current_msrp = MsrpSeasonPart(msrp=None, msrp_eff=100, months=12, weight=1)
        new_msrp = MsrpSeasonPart(msrp=100, msrp_eff=None, months=months, weight=weight)
        print(f"current_msrp: {current_msrp}")
        print(f"new_msrp: {new_msrp}")
        calc_msrp(current_msrp, new_msrp)

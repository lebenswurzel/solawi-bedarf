/*
This file is part of the SoLawi Bedarf app

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { SeasonPhase } from "../enum";
import { ExistingConfig, RequisitionConfig } from "../types";

export const getSeasonPhase = (
  config: RequisitionConfig | ExistingConfig,
  now: Date,
  userActive: boolean
): { seasonPhase: SeasonPhase; orderPhase: SeasonPhase } => {
  const startOrder = config?.startOrder!;
  const startBiddingRound = config?.startBiddingRound!;
  const endBiddingRound = config?.endBiddingRound!;
  const startSeason = config?.validFrom!;
  const endSeason = config?.validTo!;

  let seasonPhase = SeasonPhase.BEFORE_SEASON;
  if (endSeason <= now) {
    seasonPhase = SeasonPhase.AFTER_SEASON;
  } else if (startSeason <= now && now < endSeason) {
    seasonPhase = SeasonPhase.ACTIVE_SEASON;
  }

  let orderPhase = SeasonPhase.ORDER_CLOSED;
  if (userActive && startBiddingRound <= now && now < endBiddingRound) {
    orderPhase = SeasonPhase.INCREASE_ONLY;
  }
  if (userActive && startOrder <= now && now < startBiddingRound) {
    orderPhase = SeasonPhase.FREE_ORDER;
  }
  return { seasonPhase, orderPhase };
};

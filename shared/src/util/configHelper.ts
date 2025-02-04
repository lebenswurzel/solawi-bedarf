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
import { RequisitionConfig } from "../types";

export const getSeasonPhase = (
  config: RequisitionConfig,
  now: Date
): SeasonPhase => {
  const startOrder = config?.startOrder!;
  const startBiddingRound = config?.startBiddingRound!;
  const endBiddingRound = config?.endBiddingRound!;
  const startSeason = config?.validFrom!;
  const endSeason = config?.validTo!;
  if (endSeason <= now) {
    return SeasonPhase.AFTER_SEASON;
  }
  if (startSeason <= now && now < endSeason) {
    return SeasonPhase.SEASON_PHASE;
  }
  if (endBiddingRound <= now && now < startSeason) {
    return SeasonPhase.BETWEEN_BIDDING_AND_SEASON;
  }
  if (startBiddingRound <= now && now < endBiddingRound) {
    return SeasonPhase.BIDDING_PHASE;
  }
  if (startOrder <= now && now < startBiddingRound) {
    return SeasonPhase.ORDER_PHASE;
  }
  return SeasonPhase.BEFORE_ORDER;
};

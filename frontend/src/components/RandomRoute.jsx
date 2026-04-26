import "../assets/styles/RandomRoute.css";

import { ArrowRight, Dices, PlaneLanding, PlaneTakeoff } from "lucide-react";
import React, { useState } from "react";

import airportsData from "../data/airports.json";

const RandomRouteCard = ({ setIcao, handleOnSearch }) => {
	const [randomRoute, setRandomRoute] = useState({
		departure: null,
		arrival: null,
	});

	const handleRollDice = () => {
		const list = airportsData.airports;
		const depIdx = Math.floor(Math.random() * list.length);
		let arrIdx = Math.floor(Math.random() * list.length);
		while (arrIdx === depIdx) {
			arrIdx = Math.floor(Math.random() * list.length);
		}

		const newRoute = { departure: list[depIdx], arrival: list[arrIdx] };
		setRandomRoute(newRoute);
	};

	const jumpToAirport = (icao) => {
		setIcao(icao);
		handleOnSearch(icao);
	};

	return (
		<div className="random-route-card">
			<div className="route-info">
				<div className="route-header">
					<Dices size={16} className="icon-neon" />
					<span>隨機派飛任務</span>
				</div>

				<div className="route-display">
					{randomRoute.departure ? (
						<div className="route-path">
							<button
								className="apt-btn dep-btn"
								onClick={() =>
									jumpToAirport(randomRoute.departure.icao)
								}
							>
								<span className="apt-label">
									<PlaneTakeoff size={14} /> 出發
								</span>
								<span className="apt-code">
									{randomRoute.departure.icao}
								</span>
								<span className="apt-city">
									{randomRoute.departure.city}
								</span>
							</button>

							<div className="path-divider">
								<ArrowRight size={24} className="path-arrow" />
							</div>

							<button
								className="apt-btn arr-btn"
								onClick={() =>
									jumpToAirport(randomRoute.arrival.icao)
								}
							>
								<span className="apt-label">
									<PlaneLanding size={14} /> 降落
								</span>
								<span className="apt-code">
									{randomRoute.arrival.icao}
								</span>
								<span className="apt-city">
									{randomRoute.arrival.city}
								</span>
							</button>
						</div>
					) : (
						<div className="route-placeholder">
							點擊右方按鈕抽取全新航線
						</div>
					)}
				</div>
			</div>

			<button className="dice-action-btn" onClick={handleRollDice}>
				<Dices size={20} />
				<span>抽取</span>
			</button>
		</div>
	);
};

export default RandomRouteCard;

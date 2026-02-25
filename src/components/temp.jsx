{
	data.runways && data.runways.length > 0 ? (
		() => {
			const sortedRunway = [...data.runways].sort((a, b) => {
				data.common.wind_direction?.value || 0;
				const windSpd = data.common.wind_speed?.value || 0;

				const { headwind: hwA } = calculateCrossWind(
					a.heading,
					windDir,
					windSpd,
				);
				const { headwind: hwB } = calculateCrossWind(
					b.heading,
					windDir,
					windSpd,
				);

				return hwB - hwA;
			});

			const bestRunwayHeading = sortedRunway[0].name.replace(
				/[^0-9]/g,
				"",
			);

			sortedRunway.map((rwy, index) => {
				const windDir = data.common.wind_direction?.value || 0;
				const windSpd = data.common.wind_speed?.value || 0;
				const { crosswind, headwind } = calculateCrossWind(
					rwy.heading,
					windDir,
					windSpd,
				);
				const heading = rwy.name.replace(/[^0-9]/g, "");
				const isFirst = heading === bestRunwayHeading;
				return (
					<RunwayCard
						key={rwy.name}
						runwayName={rwy.name}
						heading={rwy.heading}
						windDir={data.common.wind_direction?.value || 0}
						windSpd={data.common.wind_speed?.value || 0}
						crosswind={crosswind}
						headwind={headwind}
						crossWindLimit={CrossWindLimit}
						headWindLimit={HeadWindLimit}
						tailWindLimit={TailWindLimit}
						index={index}
						isFirst={isFirst}
					/>
				);
			});
		}
	) : (
		<p
			style={{
				textAlign: "center",
				color: "#666",
			}}
		>
			無跑道資料
		</p>
	);
}

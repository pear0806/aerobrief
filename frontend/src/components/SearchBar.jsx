import "../assets/styles/SearchBar.css";

import { Search, Star } from "lucide-react";
import { useEffect, useRef } from "react";

const SearchBar = ({
	icao,
	setIcao,
	onSearch,
	loading,
	favorite,
	toggleFavorite,
}) => {
	const inputRef = useRef(null);

	useEffect(() => {
		if (inputRef.current) inputRef.current.focus();
	}, []);

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !loading) onSearch();
	};

	const isFavorited = favorite.includes(icao);

	return (
		<>
			<div className="search-container">
				<input
					ref={inputRef}
					className="search-input"
					value={icao}
					onChange={(e) => setIcao(e.target.value.toUpperCase())}
					placeholder="輸入機場代碼 (如 RCTP)"
					onKeyDown={handleKeyDown}
					maxLength={4}
					aria-label="ICAO 機場代碼"
					autoCapitalize="characters"
					autoComplete="off"
					spellCheck={false}
				/>

				<button
					type="button"
					className={`star-btn ${isFavorited ? "isFavorited" : ""}`}
					onClick={() => toggleFavorite(icao)}
					aria-label={isFavorited ? `從收藏移除 ${icao}` : `收藏 ${icao}`}
					aria-pressed={isFavorited}
				>
					<Star
						fill={isFavorited ? "#fbbf24" : "none"}
						color={isFavorited ? "#fbbf24" : "#475569"}
						size={24}
					/>
				</button>

				<button
					type="button"
					className="search-btn"
					onClick={() => onSearch()}
					disabled={loading || !icao}
				>
					{loading ? (
						"掃描中..."
					) : (
						<>
							<Search size={18} style={{ marginRight: "6px" }} />{" "}
							查詢氣象
						</>
					)}
				</button>
			</div>
			{favorite.length > 0 && (
				<div className="favorite-list">
					<span>收藏</span>
					{favorite.map((fav) => (
						<button
							key={fav}
							type="button"
							onClick={() => {
								setIcao(fav);
								onSearch(fav);
							}}
						>
							{fav}
						</button>
					))}
				</div>
			)}
		</>
	);
};

export default SearchBar;

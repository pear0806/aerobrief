import { useEffect, useRef } from "react";
import "../assets/styles/SearchBar.css";

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
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !loading) {
			onSearch();
		}
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
					disabled={loading}
				/>

				<button
					className={`star-btn ${isFavorited ? "isFavorited" : ""}`}
					onClick={() => toggleFavorite(icao)}
				>
					{isFavorited ? "★" : "☆"}
				</button>

				<button
					className="search-btn"
					onClick={onSearch}
					disabled={loading || !icao}
				>
					{loading ? "雷達掃描中..." : "查詢氣象"}
				</button>
			</div>
			{favorite.length > 0 ? (
				<div className="favorite-list">
					<span>收藏</span>
					{favorite.map((fav) => {
						return (
							<button
								key={fav}
								onClick={() => {
									setIcao(fav);
									onSearch();
								}}
							>
								{fav}
							</button>
						);
					})}
				</div>
			) : (
				""
			)}
		</>
	);
};

export default SearchBar;

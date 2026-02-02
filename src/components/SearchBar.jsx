import { useEffect, useRef } from "react";
import "../assets/styles/SearchBar.css";

const SearchBar = ({ icao, setIcao, onSearch, loading }) => {
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
	return (
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
				className="search-btn"
				onClick={onSearch}
				disabled={loading || !icao}
			>
				{loading ? "雷達掃描中..." : "查詢氣象"}
			</button>
		</div>
	);
};

export default SearchBar;

// src/data/aircrafts.js

/**
 * AeroBrief 機型風速限制資料庫 (基於 FCOM / 航空公司標準操作程序 SOP)
 * 單位: Knots (kts)
 * * 備註：
 * 1. cross: 側風限制 (多數基於 Max Demonstrated 或航空公司上限)
 * 2. tail: 順風限制 (通常為 10-15 kts 認證上限)
 * 3. head: 頂風限制 (手動降落通常無嚴格限制，此處設為 50 kts 作為極端天氣常規停飛標準；若為 Autoland 通常限制為 25 kts)
 */

export const aircraftDatabase = {
	// 預設與自訂選項
	CUSTOM: { name: "⚙️ 自訂限制 (手動輸入)", cross: 15, tail: 10, head: 20 },

	// Boeing 737 家族
	B738: {
		name: "Boeing 737-800",
		cross: 33,
		tail: 15,
		head: 50,
	},

	// Boeing 777 家族
	B77W: {
		name: "Boeing 777-300ER",
		cross: 38,
		tail: 15,
		head: 50,
	},

	// Boeing 787 家族
	B788: { name: "Boeing 787-8", cross: 33, tail: 15, head: 50 },
	B789: { name: "Boeing 787-9", cross: 33, tail: 15, head: 50 },
	B78X: {
		name: "Boeing 787-10",
		cross: 33,
		tail: 15,
		head: 50,
	},

	// Airbus A320 家族
	A320: {
		name: "Airbus A320ceo",
		cross: 38,
		tail: 15,
		head: 50,
	},
	A20N: {
		name: "Airbus A320neo",
		cross: 38,
		tail: 15,
		head: 50,
	},
	A321: {
		name: "Airbus A321ceo",
		cross: 38,
		tail: 15,
		head: 50,
	},
	A21N: {
		name: "Airbus A321neo",
		cross: 38,
		tail: 15,
		head: 50,
	},

	// Airbus 廣體客機家族
	A339: {
		name: "Airbus A330-900neo",
		cross: 32,
		tail: 15,
		head: 50,
	},
	A359: {
		name: "Airbus A350-900",
		cross: 40,
		tail: 15,
		head: 50,
	},
	A35K: {
		name: "Airbus A350-1000",
		cross: 40,
		tail: 15,
		head: 50,
	},
};

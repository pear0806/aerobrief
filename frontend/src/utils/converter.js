export const convertPressure = (value, unit) => {
	if (value == null || value == "") {
		return "-";
	} else {
		if (unit == "inHg") {
			return (value * 0.02953).toFixed(2);
		} else {
			return value;
		}
	}
};

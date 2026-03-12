import { motion } from "framer-motion";

const FadeIn = ({ children, delay = 0 }) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.6,
				delay: delay,
				ease: [0.25, 0.1, 0.25, 1],
			}}
		>
			{children}
		</motion.div>
	);
};

export default FadeIn;

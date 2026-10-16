// jsdom 沒有 IntersectionObserver，framer-motion 的 whileInView 需要它
class IO {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() { return []; }
}
globalThis.IntersectionObserver = globalThis.IntersectionObserver || IO;

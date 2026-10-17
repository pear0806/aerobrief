// jsdom 沒有 IntersectionObserver（Leaflet / 其他函式庫可能會用到）
class IO {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() { return []; }
}
globalThis.IntersectionObserver = globalThis.IntersectionObserver || IO;

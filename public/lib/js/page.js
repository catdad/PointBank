function O(obj) {
	if (typeof obj == 'object') return obj;
	else return document.getElementById(obj);
}
function S(obj) { return O(obj).style; }
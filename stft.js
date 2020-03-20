func dft(signal) {

	var n = signal.length;

	var outreal = new Array(n);
	var outimag = new Array(n);


	// initialize our output magnitude spectrum array
	for (var k = 0; k < n; k++){ // for each element in the signal

		var sumreal = 0;
		var sumimag = 0;

		for (var t = 0; t < n; t++) {
			var angle = 2 * Math.PI * t * k / n;
			sumreal += Math.cos(angle) * signal[t]
			sumimag += Math.sin(angle) * signal[t] // is this right?
		}

		outreal[k] = sumreal;
		outimag[k] = sumimag
	
	}

	return outreal, outimag;
	

}

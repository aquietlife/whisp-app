import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

var Base64Binary = {
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	
	/* will return a  Uint8Array type */
	decodeArrayBuffer: function(input) {
		var bytes = (input.length/4) * 3;
		var ab = new ArrayBuffer(bytes);
		this.decode(input, ab);
		
		return ab;
	},

	removePaddingChars: function(input){
		var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
		if(lkey == 64){
			return input.substring(0,input.length - 1);
		}
		return input;
	},

	decode: function (input, arrayBuffer) {
		//get last chars to see if are valid
		input = this.removePaddingChars(input);
		input = this.removePaddingChars(input);

		var bytes = parseInt((input.length / 4) * 3, 10);
		
		var uarray;
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		var j = 0;
		
		if (arrayBuffer)
			uarray = new Uint8Array(arrayBuffer);
		else
			uarray = new Uint8Array(bytes);
		
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		
		for (i=0; i<bytes; i+=3) {	
			//get the 3 octects in 4 ascii chars
			enc1 = this._keyStr.indexOf(input.charAt(j++));
			enc2 = this._keyStr.indexOf(input.charAt(j++));
			enc3 = this._keyStr.indexOf(input.charAt(j++));
			enc4 = this._keyStr.indexOf(input.charAt(j++));
	
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
	
			uarray[i] = chr1;			
			if (enc3 != 64) uarray[i+1] = chr2;
			if (enc4 != 64) uarray[i+2] = chr3;
		}
	
		return uarray;	
	}
}

export default function App() {

	const FILE_OPTIONS = { encoding: FileSystem.EncodingType.Base64 };

	const RECORDING_OPTIONS_PRESET_WHISP: RecordingOptions = {
		  android: {
		    extension: '.m4a',
		    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
		    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
		    sampleRate: 44100,
		    numberOfChannels: 2,
		    bitRate: 128000,
		  },
		  ios: {
		    extension: '.caf',
		    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
		    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
		    sampleRate: 44100,
		    numberOfChannels: 1,
		    bitRate: 128000,
		    linearPCMBitDepth: 16,
		    linearPCMIsBigEndian: false,
		    linearPCMIsFloat: false,
		  },
	};

	const recordingSettings = RECORDING_OPTIONS_PRESET_WHISP //JSON.parse(JSON.stringify(Audio.RECORDING_OPTIONS_PRESET_LOW_QUALITY));

	const [state, setState] = useState({
		sound: null,
		recording: null,
		isRecording: false,
	})

	const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);

	useEffect(() => {
		(async () => {
			const { status } = await Camera.requestPermissionsAsync();
			setState({
				...state,
				hasCameraPermission: status === 'granted'
			});
		})();

		(async () => {
			const { status } = await Audio.requestPermissionsAsync();
			setState({
				...state,
				hasAudioPermission: status === 'granted'
			}
			);
		})();
	}, []);

	if (state.hasCameraPermission === null) {
		return <View />;
	}

	if (state.hasCameraPermission === false) {
		return <Text>No access to camera</Text>;
	}

	const onRecordPressed = () => {
		console.log("yo");
		if (state.isRecording) {
			stopRecordingAndEnablePlayback()
		} else {
			startRecordingAndDisablePlayback()
		}
	}

	const startRecordingAndDisablePlayback = async () => {
		console.log("recording");
		if (state.sound !== null) {
			await state.sound.unloadAsync();
			state.sound.setOnPlaybackStatusUpdate(null);
			setState({ ...state, sound: null });
		}


		await Audio.setAudioModeAsync({
			allowsRecordingIOS: true,
			interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
			playsInSilentModeIOS: true,
			shouldDuckAndroid: true,
			interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
			playThroughEarpieceAndroid: false,
			staysActiveInBackground: true,
		});

		//if (state.recording!== null) {
		//state.recording.setOnRecordingStatusUpdate(null);
		//	setState({...state, recording: null});
		//}

		//state.recording = new Audio.Recording();
		state.recording = new Audio.Recording()
		await state.recording.prepareToRecordAsync(recordingSettings);
		state.recording.setOnRecordingStatusUpdate(updateRecording);

		await state.recording.startAsync();
	}

	const updateRecording = (status) => {
		setState({ ...state, isRecording: status.isRecording });
	}

	const stopRecordingAndEnablePlayback = async () => {
		try {
			await state.recording.stopAndUnloadAsync();
		} catch (error) {
			// do nothing!
		}
		console.log("stopped recording")
		console.log(state.recording)

		const info = await FileSystem.getInfoAsync(state.recording.getURI());

		console.log('File info: $JSON.stringify(info)}');

		await Audio.setAudioModeAsync({
			allowsRecordingIOS: false,
			interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
			playsInSilentModeIOS: true,
			playsInSilentLockedMode: true,
			shouldDuckAndroid: true,
			interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
			playThroughEarpieceAndroid: false,
			staysActiveInBackground: true,
		});

		const { sound: thisSound, status } = await state.recording.createNewLoadedSoundAsync(
			{
				isLooping: false,
				volume: 1.0,
				rate: 1.0,
			});

		setState({ ...state, sound: thisSound });

		const data = await FileSystem.readAsStringAsync(state.recording.getURI(), FILE_OPTIONS);

		console.log(data.length)

		var byteArray = Base64Binary.decodeArrayBuffer(data); 

		console.log(byteArray.byteLength)

	}

	const onPlayPressed = async () => {
		if (state.sound != null) {
			state.sound.playAsync()
			//console.log(state.sound)
		}

	}


	return (

		<View style={{ flex: 1 }}>
			<Camera style={{ flex: 1 }} type={cameraType}>

				{
					/*
					<figure class="chart">
					<div class="chart">
					<canvas id="amp" onclick="resume()" width="512" height="256"></canvas>
					<div class="yaxis"><label class="label">amplitude</label></div>
					</div>
					<div class="xaxis"><label>0</label><label class="label">time (ms)</label><label>48</label></div>
					</figure>
					*/
				}
				<View
					style={{
						flex: 1,
						backgroundColor: 'transparent',
						flexDirection: 'row',
					}}>
					<TouchableOpacity
						onPress={onRecordPressed}
						style={{
							backgroundColor: 'red',
							flex: 0.5,
							alignSelf: 'center',
							alignItems: 'center',
						}}>
						<Text style={{ fontSize: 20, color: '#fff' }}>Record</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={onPlayPressed}
						style={{
							backgroundColor: 'blue',
							flex: 0.5,
							alignSelf: 'center',
							alignItems: 'center',
						}}>
						<Text style={{ fontSize: 20, color: '#fff' }}>Play</Text>
					</TouchableOpacity>
				</View>
			</Camera>
		</View>
	);
}


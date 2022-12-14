"use strict";

const MESSAGE_TYPE = {
    SDP: 'SDP',
    CANDIDATE: 'CANDIDATE',
};

const MAXIMUM_MESSAGE_SIZE = 65535;
const END_OF_FILE_MESSAGE = 'EOF';
let room;
let offer_paste = '';
let px;
const senders = [];
let userMediaStream;
let displayMediaStream;
let file;
let clip = '';

const startChat = async () => {
    try {
        // showChatRoom();
        px = createPeerConnection(); // a promise to be filled later

        //Answer(); // We would call Answer here, but px is not yet initialized!
        userMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        userMediaStream.getTracks().forEach(track => senders.push(px.addTrack(track, userMediaStream)));
        document.getElementById('self-view').srcObject = userMediaStream;

    } catch (err) {
        console.error(err);
    }
};

const Answer = () => {
    if(offer_paste)
    {
        console.log('Answering');
        unpackClipboard(offer_paste);
    }
}

const createPeerConnection = () => {
    const pc = new RTCPeerConnection();
    console.log(pc);
    console.log('onnegotiationneeded');
    pc.onnegotiationneeded = async () => {
        await createAndSendOffer();
    };

    console.log('onicecandidate');
    pc.onicecandidate = (iceEvent) => {
        if (iceEvent && iceEvent.candidate) {
            console.log('if (iceEvent && iceEvent.candidate) {');
            writeMessage({
                message_type: MESSAGE_TYPE.CANDIDATE,
                content: iceEvent.candidate,
            });
        }
    };

    pc.ontrack = (event) => {
        const video = document.getElementById('remote-view');
        video.srcObject = event.streams[0];
    };

    pc.ondatachannel = (event) => {
        const { channel } = event;
        channel.binaryType = 'arraybuffer';

        const receivedBuffers = [];
        channel.onmessage = async (event) => {
            const { data } = event;
            try {
                if (data !== END_OF_FILE_MESSAGE) {
                    receivedBuffers.push(data);
                } else {
                    const arrayBuffer = receivedBuffers.reduce((acc, arrayBuffer) => {
                        const tmp = new Uint8Array(acc.byteLength + arrayBuffer.byteLength);
                        tmp.set(new Uint8Array(acc), 0);
                        tmp.set(new Uint8Array(arrayBuffer), acc.byteLength);
                        return tmp;
                    }, new Uint8Array());
                    const blob = new Blob([arrayBuffer]);
                    downloadFile(blob, channel.label);
                    channel.close();
                }
            } catch (err) {
                console.log('File transfer failed');
            }
        };
    };

    return pc;
};

const createAndSendOffer = async () => {
    const offer = await px.createOffer();
    await px.setLocalDescription(offer);

    writeMessage({
        message_type: MESSAGE_TYPE.SDP,
        content: offer,
    });
};

// Write to the shared data store
const writeMessage = (message) => {
    console.log(message);
    copyToClipboard(message);
    // if (room) {
    //     signaling.send(JSON.stringify({
    //         ...message,
    //         room,
    //     }));
    // I don't understand this '...' syntax,
    // but maybe how 'room' is later extracted
    // using  `JSON.parse(message.utf8Data);`
    // }
};

const unpackClipboard = async (message) => {
    message = "[ " + message + " ]";
    console.log('message');
    console.log(message);
    const data = JSON.parse(message);

    if (!data) {
        console.log('could not unpack clipboard' + message);
        return;
    }
    const [ sdp, ice, ice2 ] = data;

    console.log('sdp' + JSON.stringify(sdp));
    console.log('ice2' + JSON.stringify(ice2));
    readMessage(sdp);
    readMessage(ice2);
}

// Read from the shared data store
const readMessage = async (message) => {
    console.log('message');
    const data = JSON.parse(message.data);

    if (!data) {
        console.log('could not parse message' + message);
        return;
    }

    try {
        // When another peer calls `createPeerConnection()`
        if (message_type === MESSAGE_TYPE.CANDIDATE && content) {
            if(candidate)
            {
                console.log('candidate' + candidate);
            }
            await px.addIceCandidate(content);
        }
        // When another peer calls `createAndSendOffer()`
        else if (message_type === MESSAGE_TYPE.SDP) {
            if (content.type === 'offer') { // Sent by the leader
                await px.setRemoteDescription(content);
                const answer = await px.createAnswer();
                await px.setLocalDescription(answer);
                writeMessage({
                    message_type: MESSAGE_TYPE.SDP,
                    content: answer,
                });
            } else if (content.type === 'answer') { // Sent by the follower
                await px.setRemoteDescription(content);
            } else {
                console.log('Unsupported SDP type.');
            }
        }
    } catch (err) {
        console.error(err);
    }
};

// workaround until we can store on borg
const copyToClipboard = (message) => {
    if (clip != '') clip += ","; // JSON list
    clip += JSON.stringify(message)
    navigator.permissions.query({name: "clipboard-write"}).then((result) => {
        if (result.state === "granted" || result.state === "prompt") {
            navigator.clipboard.writeText(clip).then(() => {
                console.log("message appended to clipboard");
            }, () => {
                console.log("ERROR: could not write to clipboard");
            });
        }
    });
};

// This is 'server' code
// const peersByRoom = {};
// const onrequest = (message) => {
//     const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
//     const { room } = JSON.parse(message.utf8Data);
//     if (!peersByRoom[room]) { // if room is not registered
//       peersByRoom[room] = [{ connection, id }]; // Lookup peer by 'room'
//     } else if (!peersByRoom[room].find(peer => peer.id === id)) { // If peer id does not exist
//       peersByRoom[room].push({ connection, id });  // Add peer to list
//     }
//     console.log(peersByRoom);

//     // Iterate through all peers,
//     // peersByRoom[room]
//     //   .filter(peer => peer.id !== id) // but ignore yourself,
//     //   .forEach(peer => peer.connection.send(message.utf8Data)); // send message to other peers
// };

const showChatRoom = () => {
    document.getElementById('start').style.display = 'none';
    document.getElementById('chat-room').style.display = 'grid';
};

// const shareFile = () => {
//     if (file) {
//         const channelLabel = file.name;
//         const channel = px.createDataChannel(channelLabel);
//         channel.binaryType = 'arraybuffer';

//         channel.onopen = async () => {
//             const arrayBuffer = await file.arrayBuffer();
//             for (let i = 0; i < arrayBuffer.byteLength; i += MAXIMUM_MESSAGE_SIZE) {
//                 channel.send(arrayBuffer.slice(i, i + MAXIMUM_MESSAGE_SIZE));
//             }
//             channel.send(END_OF_FILE_MESSAGE);
//         };

//         channel.onclose = () => {
//             closeDialog();
//         };
//     }
// };

// const closeDialog = () => {
//     document.getElementById('select-file-input').value = '';
//     document.getElementById('select-file-dialog').style.display = 'none';
// }

// const downloadFile = (blob, fileName) => {
//     const a = document.createElement('a');
//     const url = window.URL.createObjectURL(blob);
//     a.href = url;
//     a.download = fileName;
//     a.click();
//     window.URL.revokeObjectURL(url);
//     a.remove()
// }

// document.getElementById('room-input').addEventListener('input', async (event) => {
//     const { value } = event.target;
//     if (value.length > 8) {
//         document.getElementById('start-button').disabled = false;
//         room = value;
//     } else {
//         document.getElementById('start-button').disabled = true;
//         room = null;
//     }
// });

document.getElementById('offer_paste').addEventListener('input', async (event) => {
    const { value } = event.target;
    offer_paste = value;
});

document.getElementById('start-button').addEventListener('click', async () => {
    // if (room) {
        startChat();
    // }
});

document.getElementById('Answer').addEventListener('click', async () => {
    // if (room) {
        Answer();
    // }
});

document.getElementById('share-button').addEventListener('click', async () => {
    if (!displayMediaStream) {
        displayMediaStream = await navigator.mediaDevices.getDisplayMedia();
    }
    senders.find(sender => sender.track.kind === 'video').replaceTrack(displayMediaStream.getTracks()[0]);

    //show what you are showing in your "self-view" video.
    document.getElementById('self-view').srcObject = displayMediaStream;

    //hide the share button and display the "stop-sharing" one
    document.getElementById('share-button').style.display = 'none';
    document.getElementById('stop-share-button').style.display = 'inline';
});

document.getElementById('stop-share-button').addEventListener('click', async () => {
    senders.find(sender => sender.track.kind === 'video')
        .replaceTrack(userMediaStream.getTracks().find(track => track.kind === 'video'));
    document.getElementById('self-view').srcObject = userMediaStream;
    document.getElementById('share-button').style.display = 'inline';
    document.getElementById('stop-share-button').style.display = 'none';
});

document.getElementById('share-file-button').addEventListener('click', () => {
    document.getElementById('select-file-dialog').style.display = 'block';
});

document.getElementById('cancel-button').addEventListener('click', () => {
    closeDialog();
});

document.getElementById('select-file-input').addEventListener('change', (event) => {
    file = event.target.files[0];
    document.getElementById('ok-button').disabled = !file;
});

// document.getElementById('ok-button').addEventListener('click', () => {
//     shareFile();
// });

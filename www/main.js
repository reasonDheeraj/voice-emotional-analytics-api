var isRecording = false, encode = false;
var wsh = new WebSocket( 'ws://' + window.location.href.split( '/' )[2] + '/ws' );
var avg;
var count;
//Intialiazation 
var radialObj = radialIndicator('#indicatorContainer', {
     barColor: {
        0: '#FF0000',
        33: '#FFFF00',
        66: '#0066FF',
        100: '#33CC33'
    },
    radius: (screen.height*12)/100,
    barWidth : 10,
    initValue : 40
});

var contextGraph = document.getElementById('myLineChart');
// used for example purposes
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// this post id drives the example data
var postId = 1;

var myChart = new Chart(contextGraph, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      data: [],
      borderWidth: 5,
      borderColor:'#00c0ef',
    }]
  },
  options: {
    grid: {show: false},
    responsive: true,
    title: {
      //display: true,
      //text: "Chart.js - Dynamically Update Chart Via Ajax Requests",
    },
    legend: {
      display: false
    },
    scales: {
        xAxes: [{
            display: true,
            showGrid: false,
            scaleLabel: {
                display: true,
                labelString: 'Voice Samples'
            },
        splitLine: {
                show: false
            },
        gridLines: {
                color: "rgba(0, 0, 0, 0)",
            }
        }],
        yAxes: [{
            display: false,
            scaleLabel: {
                display: false,
                labelString: 'Confidence'
            },
        splitLine: {
                show: false
            },
        gridLines: {
                color: "rgba(0, 0, 0, 0)",
            }
        }]
    }
  }
});

// // logic to get new data
// var getData = function() {
//   $.ajax({
//     url: 'https://jsonplaceholder.typicode.com/posts/' + postId + '/comments',
//     success: function(data) {
//       // process your data to pull out what you plan to use to update the chart
//       // e.g. new label and a new data point
      
//       // add new label and data point to chart's underlying data structures
//       myChart.data.labels.push("Post " + postId++);
//       myChart.data.datasets[0].data.push(getRandomIntInclusive(1, 25));
      
//       // re-render the chart
//       myChart.update();
//     }
//   });
// };

// // get new data every 3 seconds
// setInterval(getData, 3000);


// Random data
//var line1 = new TimeSeries();
//var line2 = new TimeSeries();
// setInterval(function() {
//   line1.append(new Date().getTime(), Math.random());
//   line2.append(new Date().getTime(), Math.random());
// }, 1000);

function onWsMessage( msg ){ 
    //line1.append(new Date().getTime(), msg.data.sad);
    //line2.append(new Date().getTime(), msg.data.neutral);
    
    var obj = JSON.parse(msg.data);
    //line1.append(new Date().getTime(), obj.anger);
    //Using Instance
    radialObj.animate(obj.neutral*100); 
    myChart.data.labels.push(postId++);
    myChart.data.datasets[0].data.push(obj.neutral*100);
    myChart.update();
    console.log(obj);

    //Calculate Average Confidence

}


// var smoothie = new SmoothieChart({millisPerPixel:58,maxValueScale:1.5,minValueScale:1.5,grid:{fillStyle:'#ffffff',strokeStyle:'#ffffff',sharpLines:true}});
// smoothie.addTimeSeries(line1, { strokeStyle: 'rgb(0, 255, 0)', lineWidth: 1 });
// //smoothie.addTimeSeries(line2, { strokeStyle: 'rgb(255, 0, 255)', fillStyle: 'rgba(255, 0, 255, 0.3)', lineWidth: 3 });

// smoothie.streamTo(document.getElementById("mycanvas"), 1000);

wsh.onmessage = onWsMessage;
var ap = new OpusEncoderProcessor( wsh );
var mh = new MediaHandler( ap );

function sendSettings()
{
    if( false )
    encode = 1;
    else
    encode = 0;

    var rate = String( mh.context.sampleRate / ap.downSample );
    var opusRate = String( ap.opusRate );
    var opusFrameDur = String( ap.opusFrameDur )
    console.log("sending Sample Rate " + rate)
    var msg = "m:" + [ rate, encode, opusRate, opusFrameDur ].join( "," );
    console.log( msg );
    wsh.send( msg );
}

function startRecord()
{
    document.getElementById( "record").innerHTML = "Stop";
    document.getElementById( "record").className = "Rec";
    document.getElementById( "encode" ).disabled = true;
    mh.context.resume(); // needs an await?
    sendSettings();
    isRecording = true;
    console.log( 'started recording' );
}

function stopRecord()
{
    isRecording  = false;
    document.getElementById( "record").innerHTML = "Record";
    document.getElementById( "record").className = "notRec";
    document.getElementById( "encode" ).disabled = false;
    console.log( 'ended recording' );    
}

function toggleRecord()
{
    if( isRecording )
    stopRecord();
    else
    startRecord();
}

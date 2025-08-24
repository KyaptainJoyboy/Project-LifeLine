// Set new default font family and font color to mimic Bootstrap's default styling
Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = '#858796';

function number_format(number, decimals, dec_point, thousands_sep) {
  number = (number + '').replace(',', '').replace(' ', '');
  var n = !isFinite(+number) ? 0 : +number,
    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
    sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
    dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
    s = '',
    toFixedFix = function(n, prec) {
      var k = Math.pow(10, prec);
      return '' + Math.round(n * k) / k;
    };
  s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
  }
  if ((s[1] || '').length < prec) {
    s[1] = s[1] || '';
    s[1] += new Array(prec - s[1].length + 1).join('0');
  }
  return s.join(dec);
}

// Initialize empty arrays for time labels and datasets
var timeLabels = [];
var maxDataPoints = 20; // Number of points to show on chart

// Initialize datasets for each health metric with distinct colors
var datasets = [
  {
    label: "Heart Rate",
    lineTension: 0.3,
    backgroundColor: "rgba(255, 99, 132, 0.05)",
    borderColor: "rgba(255, 99, 132, 1)",
    pointRadius: 3,
    pointBackgroundColor: "rgba(255, 99, 132, 1)",
    pointBorderColor: "rgba(255, 99, 132, 1)",
    pointHoverRadius: 3,
    pointHoverBackgroundColor: "rgba(255, 99, 132, 1)",
    pointHoverBorderColor: "rgba(255, 99, 132, 1)",
    pointHitRadius: 10,
    pointBorderWidth: 2,
    data: [],
  },
  {
    label: "Blood Pressure (Systolic)",
    lineTension: 0.3,
    backgroundColor: "rgba(54, 162, 235, 0.05)",
    borderColor: "rgba(54, 162, 235, 1)",
    pointRadius: 3,
    pointBackgroundColor: "rgba(54, 162, 235, 1)",
    pointBorderColor: "rgba(54, 162, 235, 1)",
    pointHoverRadius: 3,
    pointHoverBackgroundColor: "rgba(54, 162, 235, 1)",
    pointHoverBorderColor: "rgba(54, 162, 235, 1)",
    pointHitRadius: 10,
    pointBorderWidth: 2,
    data: [],
  },
  {
    label: "Blood Pressure (Diastolic)",
    lineTension: 0.3,
    backgroundColor: "rgba(75, 192, 192, 0.05)",
    borderColor: "rgba(75, 192, 192, 1)",
    pointRadius: 3,
    pointBackgroundColor: "rgba(75, 192, 192, 1)",
    pointBorderColor: "rgba(75, 192, 192, 1)",
    pointHoverRadius: 3,
    pointHoverBackgroundColor: "rgba(75, 192, 192, 1)",
    pointHoverBorderColor: "rgba(75, 192, 192, 1)",
    pointHitRadius: 10,
    pointBorderWidth: 2,
    data: [],
  },
  {
    label: "SpO₂",
    lineTension: 0.3,
    backgroundColor: "rgba(255, 206, 86, 0.05)",
    borderColor: "rgba(255, 206, 86, 1)",
    pointRadius: 3,
    pointBackgroundColor: "rgba(255, 206, 86, 1)",
    pointBorderColor: "rgba(255, 206, 86, 1)",
    pointHoverRadius: 3,
    pointHoverBackgroundColor: "rgba(255, 206, 86, 1)",
    pointHoverBorderColor: "rgba(255, 206, 86, 1)",
    pointHitRadius: 10,
    pointBorderWidth: 2,
    data: [],
  },
  {
    label: "Glucose",
    lineTension: 0.3,
    backgroundColor: "rgba(153, 102, 255, 0.05)",
    borderColor: "rgba(153, 102, 255, 1)",
    pointRadius: 3,
    pointBackgroundColor: "rgba(153, 102, 255, 1)",
    pointBorderColor: "rgba(153, 102, 255, 1)",
    pointHoverRadius: 3,
    pointHoverBackgroundColor: "rgba(153, 102, 255, 1)",
    pointHoverBorderColor: "rgba(153, 102, 255, 1)",
    pointHitRadius: 10,
    pointBorderWidth: 2,
    data: [],
  },
  {
    label: "Temperature",
    lineTension: 0.3,
    backgroundColor: "rgba(255, 159, 64, 0.05)",
    borderColor: "rgba(255, 159, 64, 1)",
    pointRadius: 3,
    pointBackgroundColor: "rgba(255, 159, 64, 1)",
    pointBorderColor: "rgba(255, 159, 64, 1)",
    pointHoverRadius: 3,
    pointHoverBackgroundColor: "rgba(255, 159, 64, 1)",
    pointHoverBorderColor: "rgba(255, 159, 64, 1)",
    pointHitRadius: 10,
    pointBorderWidth: 2,
    data: [],
  }
];

var ctx = document.getElementById("vitalSignsChart");
var myLineChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: timeLabels,
    datasets: datasets,
  },
  options: {
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 25,
        top: 25,
        bottom: 0
      }
    },
    scales: {
      xAxes: [{
        type: 'time',
        time: {
          unit: 'second',
          tooltipFormat: 'HH:mm:ss',
          displayFormats: {
            second: 'HH:mm:ss'
          }
        },
        gridLines: {
          display: false,
          drawBorder: false
        },
        ticks: {
          maxTicksLimit: 10
        }
      }],
      yAxes: [{
        ticks: {
          maxTicksLimit: 7,
          padding: 10,
          callback: function(value) {
            return value;
          }
        },
        gridLines: {
          color: "rgb(234, 236, 244)",
          zeroLineColor: "rgb(234, 236, 244)",
          drawBorder: false,
          borderDash: [2],
          zeroLineBorderDash: [2]
        }
      }],
    },
    legend: {
      display: true,
      position: 'top',
      labels: {
        boxWidth: 12,
        padding: 10
      }
    },
    tooltips: {
      mode: 'index',
      intersect: false,
      backgroundColor: "rgb(255,255,255)",
      bodyFontColor: "#858796",
      titleFontColor: '#6e707e',
      titleFontSize: 14,
      borderColor: '#dddfeb',
      borderWidth: 1,
      xPadding: 15,
      yPadding: 15,
      displayColors: true,
      caretPadding: 10,
      callbacks: {
        label: function(tooltipItem, chart) {
          var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
          return datasetLabel + ': ' + number_format(tooltipItem.yLabel);
        }
      }
    }
  }
});

// Function to add new data point to the chart
function addDataPoint(timestamp, metrics) {
  // Add timestamp label
  timeLabels.push(timestamp);
  if (timeLabels.length > maxDataPoints) {
    timeLabels.shift();
  }

  // Add data for each metric
  datasets[0].data.push(metrics.heartRate);
  datasets[1].data.push(metrics.bloodPressureSystolic);
  datasets[2].data.push(metrics.bloodPressureDiastolic);
  datasets[3].data.push(metrics.spo2);
  datasets[4].data.push(metrics.glucose);
  datasets[5].data.push(metrics.temperature);

  // Remove old data points if exceeding maxDataPoints
  datasets.forEach(dataset => {
    if (dataset.data.length > maxDataPoints) {
      dataset.data.shift();
    }
  });

  myLineChart.update();
}

window.addDataPoint = addDataPoint;

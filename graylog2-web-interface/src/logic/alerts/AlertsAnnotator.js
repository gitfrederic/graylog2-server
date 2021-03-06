import AlertsActions from 'actions/alerts/AlertsActions';
import AlertsStore from 'stores/alerts/AlertsStore';
import StreamStore from 'stores/streams/StreamsStore';
import DateTime from 'logic/datetimes/DateTime';

const AlertsAnnotator = {
  streams: [],

  initialize() {
    StreamStore.listStreams().then(streams => {
      this.streams = streams;
    });
  },

  fillAlertAnnotator(histogramData, stream, rickshawAnnotator, callback) {
    if (!histogramData || !histogramData[0] || !histogramData[0].x) {
      return;
    }

    const earliestDataPoint = histogramData[0].x;

    let promise;
    if (stream) {
      promise = AlertsActions.list.triggerPromise(stream, earliestDataPoint);
    } else {
      promise = AlertsActions.listAllStreams.triggerPromise(earliestDataPoint);
    }

    promise.then(response => {
      this._addAnnotations(response.alerts, rickshawAnnotator);
      if (typeof callback === 'function') {
        callback();
      }
    });
  },

  _addAnnotations(alerts, annotator) {
    if (alerts.length > 0 && !this.streams) {
      console.warn('Could not resolve stream names on alert annotations: stream list was not loaded.');
    }

    alerts.forEach(alert => {
      const epoch = DateTime.fromUTCDateTime(alert.triggered_at).toMoment().unix();
      annotator.add(epoch, this._getAlertAnnotation(alert));
      annotator.update();
    });
  },

  _getAlertAnnotation(alert) {
    let stream;
    if (this.streams) {
      stream = this.streams.filter(s => s.id === alert.stream_id)[0];
    }
    stream = stream || { title: 'Undefined' };
    return `<i class='fa fa-warning'></i> Stream "${stream.title}" triggered an alert: ${alert.description}`;
  },
};

AlertsAnnotator.initialize();

export default AlertsAnnotator;

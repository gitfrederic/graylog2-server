import React, {PropTypes} from 'react';
import Reflux from 'reflux';

import { IfPermitted, Spinner } from 'components/common';
import GettingStarted from 'components/gettingstarted/GettingStarted';
import UsageStatsOptOut from 'components/usagestats/UsageStatsOptOut';

import Routes from 'routing/Routes';

import SystemStore from 'stores/system/SystemStore';

const GETTING_STARTED_URL = 'https://gettingstarted.graylog.org/';
const GettingStartedPage = React.createClass({
  propTypes: {
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
  },
  mixins: [Reflux.connect(SystemStore)],
  _isLoading() {
    return !this.state.system;
  },
  _onDismiss() {
    this.props.history.pushState(null, Routes.STARTPAGE);
  },
  render() {
    if (this._isLoading()) {
      return <Spinner/>;
    }

    return (
      <div>
        <IfPermitted permissions="clusterconfigentry:edit:org.graylog.plugins.usagestatistics.UsageStatsOptOutState">
          <UsageStatsOptOut />
        </IfPermitted>
        <GettingStarted clusterId={this.state.system.cluster_id}
                        masterOs={this.state.system.operating_system}
                        masterVersion={this.state.system.version}
                        gettingStartedUrl={GETTING_STARTED_URL}
                        noDismissButton={Boolean(this.props.location.query.menu)}
                        onDismiss={this._onDismiss}/>
      </div>
    );
  },
});

export default GettingStartedPage;

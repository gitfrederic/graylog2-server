import React, {PropTypes} from 'react';
import {Input, Button} from 'react-bootstrap';

import ToolsStore from 'stores/tools/ToolsStore';
import ExtractorUtils from 'util/ExtractorUtils';
import FormUtils from 'util/FormsUtils';

const JSONExtractorConfiguration = React.createClass({
  propTypes: {
    configuration: PropTypes.object.isRequired,
    exampleMessage: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onExtractorPreviewLoad: PropTypes.func.isRequired,
  },
  getInitialState() {
    return {
      trying: false,
      configuration: this._getEffectiveConfiguration(this.props.configuration),
    };
  },
  componentDidMount() {
    this.props.onChange(this.state.configuration);
  },
  componentWillReceiveProps(nextProps) {
    this.setState({configuration: this._getEffectiveConfiguration(nextProps.configuration)});
  },
  DEFAULT_CONFIGURATION: {list_separator: ', ', key_separator: '_', kv_separator: '='},
  _getEffectiveConfiguration(configuration) {
    return ExtractorUtils.getEffectiveConfiguration(this.DEFAULT_CONFIGURATION, configuration);
  },
  _onChange(key) {
    return (event) => {
      this.props.onExtractorPreviewLoad(undefined);
      const newConfig = this.state.configuration;
      newConfig[key] = FormUtils.getValueFromInput(event.target);
      this.props.onChange(newConfig);
    };
  },
  _onTryClick() {
    this.setState({trying: true});

    const configuration = this.state.configuration;
    const promise = ToolsStore.testJSON(configuration.flatten, configuration.list_separator,
      configuration.key_separator, configuration.kv_separator, this.props.exampleMessage);

    promise.then(result => {
      const matches = [];
      for (const match in result.matches) {
        if (result.matches.hasOwnProperty(match)) {
          matches.push(<dt key={`${match}-name`}>{match}</dt>);
          matches.push(<dd key={`${match}-value`}><samp>{result.matches[match]}</samp></dd>);
        }
      }

      const preview = (matches.length === 0 ? '' : <dl>{matches}</dl>);
      this.props.onExtractorPreviewLoad(preview);
    });

    promise.finally(() => this.setState({trying: false}));
  },
  _isTryButtonDisabled() {
    return this.state.trying || !this.props.exampleMessage;
  },
  render() {
    return (
      <div>
        <Input type="checkbox"
               id="flatten"
               label="Flatten structures"
               wrapperClassName="col-md-offset-2 col-md-10"
               defaultChecked={this.state.configuration.flatten}
               onChange={this._onChange('flatten')}
               help="Whether to flatten JSON objects into a single message field or to expand into multiple fields."/>

        <Input type="text"
               id="list_separator"
               label="List item separator"
               labelClassName="col-md-2"
               wrapperClassName="col-md-10"
               defaultValue={this.state.configuration.list_separator}
               required
               onChange={this._onChange('list_separator')}
               help="What string to use to concatenate items of a JSON list."/>

        <Input type="text"
               id="key_separator"
               label="Key separator"
               labelClassName="col-md-2"
               wrapperClassName="col-md-10"
               defaultValue={this.state.configuration.key_separator}
               required
               onChange={this._onChange('key_separator')}
               help={<span>What string to use to concatenate different keys of a nested JSON object (only used if <em>not</em> flattened).</span>}/>

        <Input type="text"
               id="kv_separator"
               label="Key/value separator"
               labelClassName="col-md-2"
               wrapperClassName="col-md-10"
               defaultValue={this.state.configuration.kv_separator}
               required
               onChange={this._onChange('kv_separator')}
               help="What string to use when concatenating key/value pairs of a JSON object (only used if flattened)."/>

        <Input wrapperClassName="col-md-offset-2 col-md-10">
          <Button bsStyle="info" onClick={this._onTryClick} disabled={this._isTryButtonDisabled()}>
            {this.state.trying ? <i className="fa fa-spin fa-spinner"/> : 'Try'}
          </Button>
        </Input>
      </div>
    );
  },
});

export default JSONExtractorConfiguration;

/** @jsx React.DOM */
'use strict';

var Lazy = require('lazy.js'),
  React = require('react/addons'),
  ReactIntlMixin = require('react-intl'),
  saveAs = require('filesaver.js');

var BaremeChart = require('./svg/bareme-chart'),
  BaremeSettings = require('./bareme-settings'),
  helpers = require('../../helpers'),
  ReformSelector = require('./reform-selector'),
  SendFeedbackButton = require('../send-feedback-button'),
  VariablesTree = require('./variables-tree'),
  VisualizationSelect = require('./visualization-select');

var obj = helpers.obj;


var BaremeVisualization = React.createClass({
  mixins: [ReactIntlMixin],
  propTypes: {
    chartAspectRatio: React.PropTypes.number.isRequired,
    collapsedVariables: React.PropTypes.object,
    columns: React.PropTypes.object.isRequired,
    defaultProps: React.PropTypes.object.isRequired,
    diffMode: React.PropTypes.bool,
    displayBisectrix: React.PropTypes.bool,
    displaySettings: React.PropTypes.bool,
    downloadAttribution: React.PropTypes.string,
    formatNumber: React.PropTypes.func.isRequired,
    isChartFullWidth: React.PropTypes.bool,
    labelsFontSize: React.PropTypes.number,
    maxHeightRatio: React.PropTypes.number.isRequired,
    noColorFill: React.PropTypes.string.isRequired,
    onDownload: React.PropTypes.func.isRequired,
    onReformChange: React.PropTypes.func.isRequired,
    onSettingsChange: React.PropTypes.func.isRequired,
    onVisualizationChange: React.PropTypes.func.isRequired,
    reformName: React.PropTypes.string,
    testCase: React.PropTypes.object.isRequired,
    variablesTree: React.PropTypes.object.isRequired,
    visualizationSlug: React.PropTypes.string.isRequired,
    xAxisVariableCode: React.PropTypes.string.isRequired,
    xMaxValue: React.PropTypes.number.isRequired,
    xMinValue: React.PropTypes.number.isRequired,
  },
  componentDidMount: function() {
    window.onresize = this.handleWidthChange;
    this.handleWidthChange();
  },
  componentDidUpdate: function(prevProps) {
    if (prevProps.isChartFullWidth !== this.props.isChartFullWidth) {
      this.handleWidthChange();
    }
  },
  componentWillUnmount: function() {
    window.onresize = null;
  },
  formatHint: function(variables) {
    var variableName;
    if (this.state.activeVariableCode) {
      var variable = Lazy(variables).find({code: this.state.activeVariableCode});
      variableName = variable.name;
    } else {
      variableName = this.getIntlMessage('hoverOverChart');
    }
    return variableName;
  },
  getDefaultProps: function() {
    return {
      chartAspectRatio: 4/3,
      collapsedVariables: {},
      maxHeightRatio: 2/3,
      noColorFill: 'gray',
    };
  },
  getInitialState: function() {
    return {
      activeVariableCode: null,
      chartContainerWidth: null,
    };
  },
  getVariables: function() {
    var diffValues = values => {
      var referenceValues = values.slice(0, values.length / 2),
        reformValues = values.slice(values.length / 2, values.length);
      return reformValues.map((value, index) => value - referenceValues[index]);
    };
    var processNode = (variable, baseValues, depth, hidden) => {
      var newVariables = [];
      var isCollapsed = this.isCollapsed(variable);
      if (variable.children) {
        var childrenVariables = [];
        var childBaseValues = baseValues;
        Lazy(variable.children).each(child => {
          var childVariables = processNode(child, childBaseValues, depth + 1, hidden || isCollapsed);
          childrenVariables = childrenVariables.concat(childVariables);
          var values = this.props.diffMode ? diffValues(child.values) : child.values.slice(sliceStart, sliceEnd);
          childBaseValues = Lazy(childBaseValues).zip(values).map(pair => Lazy(pair).sum()).toArray();
        });
        newVariables = newVariables.concat(childrenVariables);
      }
      var values = this.props.diffMode ? diffValues(variable.values) : variable.values.slice(sliceStart, sliceEnd);
      var hasValue = Lazy(values).any(value => value !== 0);
      if (! hidden && hasValue) {
        var newVariableSequence = Lazy(variable).omit(['children']);
        var hasChildren = !! variable.children;
        newVariableSequence = newVariableSequence.assign({
          baseValues: baseValues,
          depth: depth,
          hasChildren: hasChildren,
          isCollapsed: isCollapsed,
          isSubtotal: hasChildren && depth > 0,
          values: values,
        });
        var newVariable = newVariableSequence.toObject();
        newVariables.push(newVariable);
      }
      return newVariables;
    };
    var values = this.props.variablesTree.values;
    var valuesLength = this.props.variablesTree.values.length;
    if ( ! this.props.diffMode) {
      var sliceStart = this.props.reformName ? valuesLength / 2 : 0;
      var sliceEnd = this.props.reformName ? valuesLength : valuesLength / 2;
    }
    var initBaseValues = Lazy.repeat(0, values.length / 2).toArray();
    var variables = processNode(this.props.variablesTree, initBaseValues, 0, false);
    return variables;
  },
  handleChartDownload: function() {
    var newProps = Lazy(this.refs.chart.props).omit(['ref']).assign({
      attribution: this.props.downloadAttribution,
      height: null,
      width: 800,
    }).toObject();
    var svgString = React.renderComponentToStaticMarkup(BaremeChart(newProps));
    saveAs(
      new Blob([svgString], {type: "image/svg+xml"}),
      this.formatMessage(this.getIntlMessage('baremeFilename'), {extension: 'svg'})
    );
  },
  handleVariableHover: function(variable) {
    this.setState({activeVariableCode: variable ? variable.code : null});
  },
  handleVariableToggle: function (variable) {
    this.props.onSettingsChange({
      collapsedVariables: obj(variable.code, ! this.props.collapsedVariables[variable.code]),
    });
  },
  handleWidthChange: function() {
    var chartContainerDOMNode = this.refs.chartContainer.getDOMNode();
    var width = chartContainerDOMNode.offsetWidth;
    var height = this.props.height || width / this.props.chartAspectRatio,
      maxHeight = window.innerHeight * this.props.maxHeightRatio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * this.props.chartAspectRatio;
    }
    this.setState({chartContainerWidth: width});
  },
  isCollapsed: function(variable) {
    return variable.code in this.props.collapsedVariables && this.props.collapsedVariables[variable.code];
  },
  render: function() {
    var variables = this.getVariables();
    return (
      <div>
        <div className={this.props.isChartFullWidth ? null : 'col-lg-7'}>
          <div className='form-inline'>
            <ReformSelector
              diffMode={this.props.diffMode}
              onChange={this.props.onReformChange}
              reformName={this.props.reformName}
            />
            <span style={{marginLeft: 10}}>
              <SendFeedbackButton testCase={this.props.testCase} />
            </span>
          </div>
          <hr/>
          <div>
            <div className='panel panel-default'>
              <div className='panel-heading'>
                <div className="form-inline">
                  <VisualizationSelect
                    onChange={this.props.onVisualizationChange}
                    value={this.props.visualizationSlug}
                  />
                  <div className='checkbox pull-right visible-lg-inline'>
                    <label>
                      <input
                        checked={this.props.isChartFullWidth}
                        onChange={event => this.props.onSettingsChange({isChartFullWidth: event.target.checked})}
                        type='checkbox'
                      />
                      {' ' + this.getIntlMessage('fullWidth')}
                    </label>
                  </div>
                </div>
              </div>
              <div className='list-group-item' ref='chartContainer'>
                {
                  this.state.chartContainerWidth && (
                    <BaremeChart
                      activeVariableCode={this.state.activeVariableCode}
                      displayBisectrix={this.props.displayBisectrix}
                      formatNumber={this.props.formatNumber}
                      onVariableHover={this.handleVariableHover}
                      ref='chart'
                      variables={variables}
                      width={this.state.chartContainerWidth - 15 * 2 /* Substract Bootstrap panel left and right paddings. */}
                      xAxisLabel={
                        this.props.xAxisVariableCode in this.props.columns ?
                          this.props.columns[this.props.xAxisVariableCode].label :
                          ''
                      }
                      xMaxValue={this.props.xMaxValue}
                      xMinValue={this.props.xMinValue}
                    />
                  )
                }
              </div>
              <div className='list-group-item'>
                {variables && this.formatHint(variables)}
              </div>
              <div className='panel-footer'>
                <BaremeSettings
                  columns={this.props.columns}
                  defaultProps={this.props.defaultProps}
                  displayBisectrix={this.props.displayBisectrix}
                  displaySettings={this.props.displaySettings}
                  onSettingsChange={this.props.onSettingsChange}
                  xAxisVariableCode={this.props.xAxisVariableCode}
                  xMaxValue={this.props.xMaxValue}
                  xMinValue={this.props.xMinValue}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={this.props.isChartFullWidth ? null : 'col-lg-5'}>
          <div className='panel panel-default'>
            <div className='panel-heading'>
              {this.getIntlMessage('variablesDecomposition')}
            </div>
            <div className='panel-body'>
              <VariablesTree
                activeVariableCode={this.state.activeVariableCode}
                displayVariablesColors={true}
                displayVariablesValues={false}
                formatNumber={this.props.formatNumber}
                negativeColor={this.props.negativeColor}
                noColorFill={this.props.noColorFill}
                onVariableHover={this.handleVariableHover}
                onVariableToggle={this.handleVariableToggle}
                positiveColor={this.props.positiveColor}
                variableHeightByCode={{revdisp: 5}}
                variables={variables}
              />
            </div>
          </div>
          <div className='panel panel-default'>
            <div className='panel-heading'>
              {this.getIntlMessage('dataExport')}
            </div>
            <div className='list-group'>
              <div className='list-group-item'>
                <p>
                  <span style={{marginRight: '1em'}}>{this.getIntlMessage('testCase')}</span>
                  <button className='btn btn-default btn-sm' onClick={() => this.props.onDownload('testCase', 'json')}>
                    JSON
                  </button>
                </p>
              </div>
              <div className='list-group-item'>
                <p>
                  <span style={{marginRight: '1em'}}>{this.getIntlMessage('simulationResult')}</span>
                  <button
                    className='btn btn-default btn-sm'
                    onClick={() => this.props.onDownload('simulationResult', 'json')}
                    style={{marginRight: '1em'}}>
                    JSON
                  </button>
                  <button
                    className='btn btn-default btn-sm'
                    onClick={() => this.props.onDownload('simulationResult', 'csv')}>
                    CSV
                  </button>
                </p>
              </div>
              <div className='list-group-item'>
                <p>
                  <span style={{marginRight: '1em'}}>{this.getIntlMessage('chart')}</span>
                  <button className='btn btn-default btn-sm' onClick={this.handleChartDownload}>SVG</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
});

module.exports = BaremeVisualization;

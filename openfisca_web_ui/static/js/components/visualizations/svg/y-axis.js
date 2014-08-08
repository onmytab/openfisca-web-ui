/** @jsx React.DOM */
'use strict';

var Lazy = require('lazy.js'),
  React = require('react'),
  strformat = require('strformat');


var YAxis = React.createClass({
  propTypes: {
    formatNumber: React.PropTypes.func.isRequired,
    height: React.PropTypes.number.isRequired,
    label: React.PropTypes.string,
    labelFontSize: React.PropTypes.number.isRequired,
    maxValue: React.PropTypes.number.isRequired,
    minValue: React.PropTypes.number.isRequired,
    nbSteps: React.PropTypes.number.isRequired,
    strokeColor: React.PropTypes.string.isRequired,
    tickFontSize: React.PropTypes.number.isRequired,
    tickSize: React.PropTypes.number.isRequired,
    unit: React.PropTypes.string,
    width: React.PropTypes.number.isRequired,
  },
  getDefaultProps: function() {
    return {
      labelFontSize: 14,
      minValue: 0,
      nbSteps: 10,
      strokeColor: 'black',
      tickFontSize: 12,
      tickSize: 6,
    };
  },
  render: function() {
    var stepRange = (this.props.maxValue - this.props.minValue) / this.props.nbSteps;
    var stepHeight = this.valueToPixel(stepRange);
    var steps = Lazy.range(this.props.minValue, this.props.maxValue + stepRange, stepRange).toArray();
    var lineStyle = {stroke: this.props.strokeColor, shapeRendering: 'crispedges'};
    return (
      <g className="axis y-axis">
        <line style={lineStyle} x2={0} y2={this.props.height} />
        {
          steps.map(function(value, idx) {
            var translateY = this.props.height - idx * stepHeight;
            return (
              <g key={'tick-' + idx} transform={'translate(0, ' + translateY + ')'}>
                <text
                  style={{textAnchor: 'end', fontSize: this.props.tickFontSize}}
                  x={- this.props.tickSize * 1.66}
                  y={this.props.tickFontSize * 0.4}>
                  {
                    strformat(this.props.unit && value > 0 ? '{value} {unit}' : '{value}', {
                      unit: this.props.unit,
                      value: this.props.formatNumber(value),
                    })
                  }
                </text>
                <line style={lineStyle} x2={- this.props.tickSize} y2={0} />
              </g>
            );
          }, this)
        }
        {
          this.props.label && (
            <text
              className='axis-label'
              style={{textAnchor: 'middle', fontSize: this.props.labelFontSize}}
              transform='rotate(-90)'
              x={- (this.props.height / 2)}
              y={- this.props.width + this.props.labelFontSize}>
              {this.props.label}
            </text>
          )
        }
      </g>
    );
  },
  valueToPixel: function(value) {
    return (value / (this.props.maxValue - this.props.minValue)) * this.props.height;
  },
});

module.exports = YAxis;

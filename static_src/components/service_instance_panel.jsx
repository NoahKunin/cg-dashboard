
import React from 'react';

import style from 'cloudgov-style/css/cloudgov-style.css';

import Action from './action.jsx';
import AppStore from '../stores/app_store.js';
import Loading from './loading.jsx';
import OrgStore from '../stores/org_store.js';
import Panel from './panel.jsx';
import PanelActions from './panel_actions.jsx';
import PanelHeader from './panel_header.jsx';
import PanelGroup from './panel_group.jsx';
import ServiceBindingStore from '../stores/service_binding_store.js';
import ServiceInstanceListPanel from './service_instance_list_panel.jsx';
import ServiceInstanceStore from '../stores/service_instance_store.js';
import ServicePlanStore from '../stores/service_plan_store.js';
import SpaceStore from '../stores/space_store.js';

import createStyler from '../util/create_styler';

const propTypes = {
};

const defaultProps = {
};


function boundReady(instances) {
  return ServiceInstanceStore.fetched && ServicePlanStore.fetched &&
      ServiceBindingStore.fetched && !instances.length;
}

function unboundReady(instances) {
  return ServiceInstanceStore.fetched && ServicePlanStore.fetched &&
    !instances.length;
}

function stateSetter() {
  const currentOrgGuid = OrgStore.currentOrgGuid;
  const currentSpaceGuid = SpaceStore.currentSpaceGuid;
  const currentSpaceName = SpaceStore.currentSpaceName;
  const currentAppGuid = AppStore.currentAppGuid;

  const appServiceBindings = ServiceBindingStore.getAllByApp(currentAppGuid);
  const allServiceBindings = ServiceBindingStore.getAll();

  const serviceInstances = ServiceInstanceStore.getAllBySpaceGuid(currentSpaceGuid)
  .map((serviceInstance) => {
    const serviceBindings = [];
    const servicePlan = ServicePlanStore.get(serviceInstance.service_plan_guid);
    const serviceBinding = allServiceBindings.find((binding) =>
      serviceInstance.guid === binding.service_instance_guid
    );
    if (serviceBinding) serviceBindings.push(serviceBinding);

    return Object.assign({}, serviceInstance,
      { servicePlan, serviceBindings });
  });

  const boundServiceInstances = serviceInstances.filter((serviceInstance) =>
    ServiceInstanceStore.isInstanceBound(serviceInstance, appServiceBindings)
  );

  const unboundServiceInstances = serviceInstances.filter((serviceInstance) =>
    !ServiceInstanceStore.isInstanceBound(serviceInstance, appServiceBindings)
  );

  const loading = ServiceInstanceStore.fetching ||
    ServicePlanStore.fetching ||
    ServiceBindingStore.fetching;

  return {
    currentAppGuid,
    currentSpaceGuid,
    currentOrgGuid,
    currentSpaceName,
    boundServiceInstances,
    unboundServiceInstances,
    loading
  };
}

export default class ServiceInstancePanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = stateSetter();
    this.styler = createStyler(style);

    this._onChange = this._onChange.bind(this);
    this.handlePurchaseLink = this.handlePurchaseLink.bind(this);
  }

  componentDidMount() {
    ServiceInstanceStore.addChangeListener(this._onChange);
    ServiceBindingStore.addChangeListener(this._onChange);
    ServicePlanStore.addChangeListener(this._onChange);
  }

  componentWillUnmount() {
    ServiceInstanceStore.removeChangeListener(this._onChange);
    ServiceBindingStore.removeChangeListener(this._onChange);
    ServicePlanStore.removeChangeListener(this._onChange);
  }

  _onChange() {
    this.setState(stateSetter());
  }

  handlePurchaseLink(ev) {
    ev.preventDefault();
    window.location.href = `/#/org/${this.state.currentOrgGuid}/marketplace`;
  }

  get spaceLink() {
    return (
      <a href={ `/#/org/${this.state.currentOrgGuid}/spaces/${this.state.currentSpaceGuid}` }>
        { this.state.currentSpaceName }
      </a>
    );
  }

  render() {
    let loading = <Loading text="Loading services" />;
    let content = <div>{ loading }</div>;

    if (!this.state.loading) {
      content = [
        <PanelGroup key="1">
          <PanelHeader>
            <h3>Bound service instances</h3>
          </PanelHeader>
          <ServiceInstanceListPanel
            currentAppGuid={ this.state.currentAppGuid }
            serviceInstances={ this.state.boundServiceInstances }
            bound
            empty={ boundReady(this.state.boundServiceInstances) }
          />
        </PanelGroup>,
        <PanelGroup key="2">
          <PanelHeader>
            <h3>Service instances available in { this.spaceLink }</h3>
          </PanelHeader>
          <ServiceInstanceListPanel
            currentAppGuid={ this.state.currentAppGuid }
            serviceInstances={ this.state.unboundServiceInstances }
            empty={ unboundReady(this.state.unboundServiceInstances) }
          />
        </PanelGroup>,
        <PanelGroup key="3">
          <PanelActions>
          <Action clickHandler={ this.handlePurchaseLink }
            label="Purchase new services"
            type="outline">
              Purchase a new service for this app
            </Action>
          </PanelActions>
        </PanelGroup>
      ];
    }

    return (
      <Panel title="Services">
        { content }
      </Panel>
    );
  }
}

ServiceInstancePanel.propTypes = propTypes;
ServiceInstancePanel.defaultProps = defaultProps;

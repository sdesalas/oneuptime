import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Validate } from '../../config';
import { reduxForm, Field, FieldArray } from 'redux-form';
import ClickOutside from 'react-click-outside';
import { updateSlack } from '../../actions/slackWebhook';
import ShouldRender from '../basic/ShouldRender';
import { FormLoader } from '../basic/Loader';
import { RenderField } from '../basic/RenderField';
import { RenderSelect } from '../basic/RenderSelect';

function validate(values) {
    const errors = {};

    if (!Validate.url(values.endpoint)) {
        errors.endpoint = 'Webhook url is required!';
    }

    return errors;
}

class EditWebHook extends React.Component {
    state = {
        monitorError: null,
    };
    componentDidMount() {
        window.addEventListener('keydown', this.handleKeyBoard);
    }

    componentWillUnmount() {
        window.removeEventListener('keydown', this.handleKeyBoard);
    }

    submitForm = values => {
        const {
            updateSlack,
            closeThisDialog,
            data,
            currentProject,
            monitor,
        } = this.props;

        const postObj = {};
        const { selectAllMonitors } = values;
        const monitorId = data.currentMonitorId;
        let { monitors } = values;
        const allMonitors = monitor.monitorsList.monitors
            .map(monitor => monitor.monitors)
            .flat();

        if (selectAllMonitors) {
            monitors = allMonitors.map(monitor => monitor._id);
        }
        if (monitors && monitors.length > 0) {
            monitors = monitors.filter(
                monitorId => typeof monitorId === 'string'
            );
        }
        if (monitorId) {
            monitors = [monitorId];
        }
        if (!monitors || (monitors && monitors.length === 0)) {
            this.setState({
                monitorError: 'No monitor was selected',
            });
            return;
        }
        postObj.webHookName = values.webHookName;
        postObj.endpoint = values.endpoint;
        postObj.endpointType = values.endpointType;
        postObj.type = 'slack';
        postObj.monitors = values.monitors.map(id => ({ monitorId: id }));
        postObj.incidentCreated = values.incidentCreated
            ? values.incidentCreated
            : false;
        postObj.incidentResolved = values.incidentResolved
            ? values.incidentResolved
            : false;
        postObj.incidentAcknowledged = values.incidentAcknowledged
            ? values.incidentAcknowledged
            : false;
        postObj.incidentNoteAdded = values.incidentNoteAdded
            ? values.incidentNoteAdded
            : false;

        const isDuplicate = postObj.monitors
            ? postObj.monitors.length === new Set(postObj.monitors).size
                ? false
                : true
            : false;
        if (isDuplicate) {
            this.setState({
                monitorError: 'Duplicate monitor selection found',
            });
            postObj.monitors = [];
            return;
        }
        updateSlack(currentProject._id, data._id, postObj).then(() => {
            if (this.props.newSlack && !this.props.newSlack.error) {
                closeThisDialog();
            }
        });
    };

    handleKeyBoard = e => {
        switch (e.key) {
            case 'Escape':
                return this.props.closeThisDialog();
            case 'Enter':
                return document.getElementById('slackUpdate').click();
            default:
                return false;
        }
    };

    renderMonitors = ({ fields }) => {
        const { monitorError } = this.state;
        const { allComponents, formValues } = this.props;

        const allMonitors = this.props.monitor.monitorsList.monitors
            .map(monitor => monitor.monitors)
            .flat();

        const getParentComponent = monitor =>
            allComponents.filter(
                component => component._id === monitor.componentId._id
            )[0];

        return (
            <>
                {formValues && formValues.selectAllMonitors && (
                    <div
                        className="bs-Fieldset-row"
                        style={{ padding: 0, width: '100%' }}
                    >
                        <div
                            className="bs-Fieldset-fields bs-Fieldset-fields--wide"
                            style={{ padding: 0 }}
                        >
                            <div
                                className="Box-root"
                                style={{
                                    height: '5px',
                                }}
                            ></div>
                            <div className="Box-root Flex-flex Flex-alignItems--stretch Flex-direction--column Flex-justifyContent--flexStart">
                                <label
                                    className="Checkbox"
                                    htmlFor="selectAllMonitorsBox"
                                >
                                    <Field
                                        component="input"
                                        type="checkbox"
                                        name="selectAllMonitors"
                                        className="Checkbox-source"
                                        id="selectAllMonitorsBox"
                                    />
                                    <div className="Checkbox-box Box-root Margin-top--2 Margin-right--2">
                                        <div className="Checkbox-target Box-root">
                                            <div className="Checkbox-color Box-root"></div>
                                        </div>
                                    </div>
                                    <div className="Checkbox-label Box-root Margin-left--8">
                                        <span className="Text-color--default Text-display--inline Text-fontSize--14 Text-lineHeight--20 Text-typeface--base Text-wrap--wrap">
                                            <span>All Monitors Selected</span>
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
                {formValues && !formValues.selectAllMonitors && (
                    <div
                        style={{
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        <button
                            id="addMoreMonitor"
                            className="Button bs-ButtonLegacy ActionIconParent"
                            style={{
                                position: 'absolute',
                                zIndex: 1,
                                right: 0,
                            }}
                            type="button"
                            onClick={() => {
                                fields.push();
                            }}
                        >
                            <span className="bs-Button bs-FileUploadButton bs-Button--icon bs-Button--new">
                                <span>Add Monitor</span>
                            </span>
                        </button>
                        {fields.length === 0 && !formValues.selectAllMonitors && (
                            <div
                                className="bs-Fieldset-row"
                                style={{ padding: 0, width: '100%' }}
                            >
                                <div
                                    className="bs-Fieldset-fields bs-Fieldset-fields--wide"
                                    style={{ padding: 0 }}
                                >
                                    <div
                                        className="Box-root"
                                        style={{
                                            height: '5px',
                                        }}
                                    ></div>
                                    <div className="Box-root Flex-flex Flex-alignItems--stretch Flex-direction--column Flex-justifyContent--flexStart">
                                        <label
                                            className="Checkbox"
                                            htmlFor="selectAllMonitorsBox"
                                        >
                                            <Field
                                                component="input"
                                                type="checkbox"
                                                name="selectAllMonitors"
                                                className="Checkbox-source"
                                                id="selectAllMonitorsBox"
                                            />
                                            <div className="Checkbox-box Box-root Margin-top--2 Margin-right--2">
                                                <div className="Checkbox-target Box-root">
                                                    <div className="Checkbox-color Box-root"></div>
                                                </div>
                                            </div>
                                            <div className="Checkbox-label Box-root Margin-left--8">
                                                <span className="Text-color--default Text-display--inline Text-fontSize--14 Text-lineHeight--20 Text-typeface--base Text-wrap--wrap">
                                                    <span>
                                                        Select All Monitors
                                                    </span>
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                        {fields.map((field, index) => {
                            return (
                                <div
                                    style={{
                                        width: '65%',
                                        marginBottom: 10,
                                    }}
                                    key={index}
                                >
                                    <Field
                                        className="db-select-nw Table-cell--width--maximized"
                                        component={RenderSelect}
                                        name={field}
                                        id={`monitorfield_${index}`}
                                        placeholder="Monitor"
                                        style={{
                                            height: '28px',
                                            width: '100%',
                                        }}
                                        options={[
                                            {
                                                value: '',
                                                label: 'Select monitor',
                                            },
                                            ...(allMonitors &&
                                            allMonitors.length > 0
                                                ? allMonitors.map(monitor => ({
                                                      value: monitor._id,
                                                      label: `${
                                                          getParentComponent(
                                                              monitor
                                                          ).name
                                                      } / ${monitor.name}`,
                                                  }))
                                                : []),
                                        ]}
                                    />
                                    <button
                                        id="addMoreMonitor"
                                        className="Button bs-ButtonLegacy ActionIconParent"
                                        style={{
                                            marginTop: 10,
                                        }}
                                        type="button"
                                        onClick={() => {
                                            fields.remove(index);
                                        }}
                                    >
                                        <span className="bs-Button bs-Button--icon bs-Button--delete">
                                            <span>Remove Monitor</span>
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                        {monitorError && (
                            <div
                                className="Box-root Flex-flex Flex-alignItems--stretch Flex-direction--row Flex-justifyContent--flexStart"
                                style={{
                                    marginTop: '5px',
                                    alignItems: 'center',
                                }}
                            >
                                <div
                                    className="Box-root Margin-right--8"
                                    style={{ marginTop: '2px' }}
                                >
                                    <div className="Icon Icon--info Icon--color--red Icon--size--14 Box-root Flex-flex"></div>
                                </div>
                                <div className="Box-root">
                                    <span
                                        id="monitorError"
                                        style={{ color: 'red' }}
                                    >
                                        {monitorError}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </>
        );
    };
    render() {
        const { handleSubmit, closeThisDialog, data } = this.props;

        const monitorList = [];

        const allMonitors = this.props.monitor.monitorsList.monitors
            .map(monitor => monitor.monitors)
            .flat();
        if (allMonitors && allMonitors.length > 0) {
            allMonitors.map(monitor =>
                monitorList.push({
                    value: monitor._id,
                    label: monitor.name,
                })
            );
        }

        return (
            <div
                className="ModalLayer-contents"
                tabIndex="-1"
                style={{ marginTop: '40px' }}
            >
                <div className="bs-BIM">
                    <div className="bs-Modal" style={{ width: 600 }}>
                        <ClickOutside onClickOutside={closeThisDialog}>
                            <div className="bs-Modal-header">
                                <div
                                    className="bs-Modal-header-copy bs-u-flex Flex-direction--column"
                                    style={{
                                        marginBottom: '10px',
                                        marginTop: '10px',
                                    }}
                                >
                                    <span className="Text-color--inherit Text-display--inline Text-fontSize--20 Text-fontWeight--medium Text-lineHeight--24 Text-typeface--base Text-wrap--wrap Margin-bottom--4">
                                        <span>Update Slack Webhook</span>
                                    </span>
                                    <span className="ContentHeader-description Text-color--inherit Text-display--inline Text-fontSize--14 Text-fontWeight--regular Text-lineHeight--20 Text-typeface--base Text-wrap--wrap">
                                        <span>
                                            Click{' '}
                                            <a
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                href="https://github.com/Fyipe/feature-docs/blob/master/Webhooks.md#slack"
                                                style={{
                                                    textDecoration: 'underline',
                                                }}
                                            >
                                                here
                                            </a>{' '}
                                            to check documentation on how to
                                            integrate Slack with Fyipe.
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <form onSubmit={handleSubmit(this.submitForm)}>
                                <div className="bs-Modal-content">
                                    <div className="bs-Fieldset-wrapper Box-root Margin-bottom--2">
                                        <fieldset className="Margin-bottom--16">
                                            <div className="bs-Fieldset-rows">
                                                <div
                                                    className="bs-Fieldset-row"
                                                    style={{ padding: 0 }}
                                                >
                                                    <label
                                                        className="bs-Fieldset-label Text-align--left"
                                                        htmlFor="webHookName"
                                                    >
                                                        <span>Name</span>
                                                    </label>
                                                    <div className="bs-Fieldset-fields">
                                                        <div
                                                            className="bs-Fieldset-field"
                                                            style={{
                                                                width: '100%',
                                                            }}
                                                        >
                                                            <Field
                                                                component={
                                                                    RenderField
                                                                }
                                                                name="webHookName"
                                                                placeholder="Webhook Name"
                                                                id="webHookName"
                                                                type="text"
                                                                className="db-BusinessSettings-input TextInput bs-TextInput"
                                                                style={{
                                                                    width:
                                                                        '100%',
                                                                    padding:
                                                                        '3px 5px',
                                                                }}
                                                                autoFocus={true}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </fieldset>
                                        <fieldset className="Margin-bottom--16">
                                            <div className="bs-Fieldset-rows">
                                                <div
                                                    className="bs-Fieldset-row"
                                                    style={{ padding: 0 }}
                                                >
                                                    <label
                                                        className="bs-Fieldset-label Text-align--left"
                                                        htmlFor="endpoint"
                                                    >
                                                        <span>
                                                            Endpoint URL
                                                        </span>
                                                    </label>
                                                    <div className="bs-Fieldset-fields">
                                                        <div
                                                            className="bs-Fieldset-field"
                                                            style={{
                                                                width: '100%',
                                                            }}
                                                        >
                                                            <Field
                                                                component={
                                                                    RenderField
                                                                }
                                                                name="endpoint"
                                                                placeholder="Enter Slack Webhook URL"
                                                                id="endpoint"
                                                                type="url"
                                                                className="db-BusinessSettings-input TextInput bs-TextInput"
                                                                style={{
                                                                    width:
                                                                        '100%',
                                                                    padding:
                                                                        '3px 5px',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </fieldset>

                                        <ShouldRender
                                            if={!data.currentMonitorId}
                                        >
                                            <fieldset className="Margin-bottom--16">
                                                <div className="bs-Fieldset-rows">
                                                    <div
                                                        className="bs-Fieldset-row Margin-bottom--12 Padding-left--0"
                                                        style={{ padding: 0 }}
                                                    >
                                                        <label
                                                            className="bs-Fieldset-label Text-align--left"
                                                            htmlFor="monitorId"
                                                        >
                                                            <span>
                                                                Monitors
                                                            </span>
                                                        </label>
                                                        <div className="bs-Fieldset-fields">
                                                            <FieldArray
                                                                name="monitors"
                                                                component={
                                                                    this
                                                                        .renderMonitors
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </ShouldRender>
                                        <fieldset className="Margin-bottom--16">
                                            <div className="bs-Fieldset-rows">
                                                <div
                                                    className="bs-Fieldset-row"
                                                    style={{ padding: 0 }}
                                                >
                                                    <label
                                                        className="bs-Fieldset-label Text-align--left"
                                                        htmlFor="monitorId"
                                                    >
                                                        <span></span>
                                                    </label>
                                                    <div
                                                        className="bs-Fieldset-fields"
                                                        style={{
                                                            paddingTop: '6px',
                                                        }}
                                                    >
                                                        <div className="bs-Fieldset-field">
                                                            <label
                                                                className="Checkbox"
                                                                style={{
                                                                    marginRight:
                                                                        '12px',
                                                                }}
                                                            >
                                                                <Field
                                                                    component="input"
                                                                    type="checkbox"
                                                                    name="incidentCreated"
                                                                    className="Checkbox-source"
                                                                    id="incidentCreated"
                                                                />
                                                                <div className="Checkbox-box Box-root Margin-right--2">
                                                                    <div className="Checkbox-target Box-root">
                                                                        <div className="Checkbox-color Box-root"></div>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="Box-root"
                                                                    style={{
                                                                        paddingLeft:
                                                                            '5px',
                                                                    }}
                                                                >
                                                                    <label>
                                                                        <span>
                                                                            Ping
                                                                            when
                                                                            incident
                                                                            is
                                                                            Created
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </fieldset>

                                        <fieldset className="Margin-bottom--16">
                                            <div className="bs-Fieldset-rows">
                                                <div
                                                    className="bs-Fieldset-row"
                                                    style={{ padding: 0 }}
                                                >
                                                    <label
                                                        className="bs-Fieldset-label Text-align--left"
                                                        htmlFor="monitorId"
                                                    >
                                                        <span></span>
                                                    </label>
                                                    <div
                                                        className="bs-Fieldset-fields"
                                                        style={{
                                                            paddingTop: '6px',
                                                        }}
                                                    >
                                                        <div className="bs-Fieldset-field">
                                                            <label
                                                                className="Checkbox"
                                                                style={{
                                                                    marginRight:
                                                                        '12px',
                                                                }}
                                                            >
                                                                <Field
                                                                    component="input"
                                                                    type="checkbox"
                                                                    name="incidentAcknowledged"
                                                                    className="Checkbox-source"
                                                                    id="incidentAcknowledged"
                                                                />
                                                                <div className="Checkbox-box Box-root Margin-right--2">
                                                                    <div className="Checkbox-target Box-root">
                                                                        <div className="Checkbox-color Box-root"></div>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="Box-root"
                                                                    style={{
                                                                        paddingLeft:
                                                                            '5px',
                                                                    }}
                                                                >
                                                                    <label>
                                                                        <span>
                                                                            Ping
                                                                            when
                                                                            incident
                                                                            is
                                                                            Acknowledged
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </fieldset>

                                        <fieldset className="Margin-bottom--16">
                                            <div className="bs-Fieldset-rows">
                                                <div
                                                    className="bs-Fieldset-row"
                                                    style={{ padding: 0 }}
                                                >
                                                    <label
                                                        className="bs-Fieldset-label Text-align--left"
                                                        htmlFor="monitorId"
                                                    >
                                                        <span></span>
                                                    </label>
                                                    <div
                                                        className="bs-Fieldset-fields"
                                                        style={{
                                                            paddingTop: '6px',
                                                        }}
                                                    >
                                                        <div className="bs-Fieldset-field">
                                                            <label
                                                                className="Checkbox"
                                                                style={{
                                                                    marginRight:
                                                                        '12px',
                                                                }}
                                                            >
                                                                <Field
                                                                    component="input"
                                                                    type="checkbox"
                                                                    name="incidentResolved"
                                                                    className="Checkbox-source"
                                                                    id="incidentResolved"
                                                                />
                                                                <div className="Checkbox-box Box-root Margin-right--2">
                                                                    <div className="Checkbox-target Box-root">
                                                                        <div className="Checkbox-color Box-root"></div>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="Box-root"
                                                                    style={{
                                                                        paddingLeft:
                                                                            '5px',
                                                                    }}
                                                                >
                                                                    <label>
                                                                        <span>
                                                                            Ping
                                                                            when
                                                                            incident
                                                                            is
                                                                            Resolved
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </fieldset>
                                        <fieldset className="Margin-bottom--16">
                                            <div className="bs-Fieldset-rows">
                                                <div
                                                    className="bs-Fieldset-row"
                                                    style={{ padding: 0 }}
                                                >
                                                    <label
                                                        className="bs-Fieldset-label Text-align--left"
                                                        htmlFor="monitorId"
                                                    >
                                                        <span></span>
                                                    </label>
                                                    <div
                                                        className="bs-Fieldset-fields"
                                                        style={{
                                                            paddingTop: '6px',
                                                        }}
                                                    >
                                                        <div className="bs-Fieldset-field">
                                                            <label
                                                                className="Checkbox"
                                                                style={{
                                                                    marginRight:
                                                                        '12px',
                                                                }}
                                                            >
                                                                <Field
                                                                    component="input"
                                                                    type="checkbox"
                                                                    name="incidentNoteAdded"
                                                                    className="Checkbox-source"
                                                                    id="incidentNoteAdded"
                                                                />
                                                                <div className="Checkbox-box Box-root Margin-right--2">
                                                                    <div className="Checkbox-target Box-root">
                                                                        <div className="Checkbox-color Box-root"></div>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="Box-root"
                                                                    style={{
                                                                        paddingLeft:
                                                                            '5px',
                                                                    }}
                                                                >
                                                                    <label>
                                                                        <span>
                                                                            Ping
                                                                            when
                                                                            incident
                                                                            note
                                                                            is
                                                                            added
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </fieldset>
                                    </div>
                                </div>
                                <div className="bs-Modal-footer">
                                    <div className="bs-Modal-footer-actions">
                                        <ShouldRender
                                            if={
                                                this.props.newSlack &&
                                                this.props.newSlack.error
                                            }
                                        >
                                            <div className="bs-Tail-copy">
                                                <div
                                                    className="Box-root Flex-flex Flex-alignItems--stretch Flex-direction--row Flex-justifyContent--flexStart"
                                                    style={{
                                                        marginTop: '10px',
                                                    }}
                                                >
                                                    <div className="Box-root Margin-right--8">
                                                        <div className="Icon Icon--info Icon--color--red Icon--size--14 Box-root Flex-flex"></div>
                                                    </div>
                                                    <div className="Box-root">
                                                        <span
                                                            style={{
                                                                color: 'red',
                                                            }}
                                                        >
                                                            {
                                                                this.props
                                                                    .newSlack
                                                                    .error
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </ShouldRender>
                                        <button
                                            className="bs-Button bs-DeprecatedButton btn__modal"
                                            type="button"
                                            onClick={closeThisDialog}
                                        >
                                            <span>Cancel</span>
                                            <span className="cancel-btn__keycode">
                                                Esc
                                            </span>
                                        </button>
                                        <button
                                            className="bs-Button bs-DeprecatedButton bs-Button--blue btn__modal"
                                            disabled={
                                                this.props.newSlack &&
                                                this.props.newSlack.requesting
                                            }
                                            type="submit"
                                            id="slackUpdate"
                                        >
                                            {this.props.newSlack &&
                                                !this.props.newSlack
                                                    .requesting && (
                                                    <>
                                                        <span>Update</span>
                                                        <span className="create-btn__keycode">
                                                            <span className="keycode__icon keycode__icon--enter" />
                                                        </span>
                                                    </>
                                                )}
                                            {this.props.newSlack &&
                                                this.props.newSlack
                                                    .requesting && (
                                                    <FormLoader />
                                                )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </ClickOutside>
                    </div>
                </div>
            </div>
        );
    }
}

EditWebHook.displayName = 'EditSlackWebHook';

EditWebHook.propTypes = {
    currentProject: PropTypes.object,
    updateSlack: PropTypes.func.isRequired,
    closeThisDialog: PropTypes.func.isRequired,
    handleSubmit: PropTypes.func.isRequired,
    monitor: PropTypes.object,
    newSlack: PropTypes.object,
    data: PropTypes.object.isRequired,
    allComponents: PropTypes.array,
    formValues: PropTypes.object,
};

const NewEditWebHook = compose(
    reduxForm({
        form: 'NewEditSlackWebHook',
        validate,
        enableReinitialize: true,
        destroyOnUnmount: true,
        keepDirtyOnReinitialize: true,
        updateUnregisteredFields: true,
    })
)(EditWebHook);

const mapDispatchToProps = dispatch =>
    bindActionCreators(
        {
            updateSlack,
        },
        dispatch
    );

const mapStateToProps = (state, props) => {
    const currentMonitorValue = { value: '', label: 'Select monitor' };

    if (props.data && props.data.monitorId) {
        currentMonitorValue.label = props.data.monitorId.name;
        currentMonitorValue.value = props.data.monitorId._id;
    }
    const allComponents = state.component.componentList.components
        .map(component => component.components)
        .flat();
    const monitors = props.data.data.monitors.map(monitor => monitor.monitorId);
    return {
        slacks: state.slackWebhooks,
        monitor: state.monitor,
        allComponents,
        currentProject: state.project.currentProject,
        newSlack: state.slackWebhooks.updateSlack,
        formValues:
            state.form.NewEditSlackWebHook &&
            state.form.NewEditSlackWebHook.values,
        initialValues: {
            webHookName: props.data.data.webHookName,
            monitors,
            selectMonitors: true,
            endpoint: props.data.data.endpoint,
            monitorId: currentMonitorValue.value,
            incidentCreated: props.data.notificationOptions.incidentCreated,
            incidentResolved: props.data.notificationOptions.incidentResolved,
            incidentAcknowledged:
                props.data.notificationOptions.incidentAcknowledged,
            incidentNoteAdded: props.data.notificationOptions.incidentNoteAdded,
        },
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(NewEditWebHook);

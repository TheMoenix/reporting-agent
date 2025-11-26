import React, { useEffect } from "react";
import { Select, Space, Typography, Button, Tooltip } from "antd";
import { DatabaseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useGetConnectionsQuery } from "../../graphql/generated/hooks";
import { Connection } from "../../graphql/generated/schemas";

const { Text } = Typography;

interface ConnectionSelectorProps {
  selectedConnectionId?: string | null;
  onConnectionSelect: (connectionId: string | null) => void;
  size?: "small" | "middle" | "large";
}

function ConnectionSelector({
  selectedConnectionId,
  onConnectionSelect,
  size = "middle",
}: ConnectionSelectorProps) {
  const {
    data: connectionsData,
    loading: connectionsLoading,
    refetch: refetchConnections,
  } = useGetConnectionsQuery();

  const connections = connectionsData?.connections || [];
  const activeConnections = connections.filter(
    (connection: Connection) => connection.isActive
  );

  useEffect(() => {
    if (!selectedConnectionId && activeConnections.length > 0) {
      onConnectionSelect(activeConnections[0]._id);
    }
  }, [activeConnections, selectedConnectionId, onConnectionSelect]);

  const handleRefresh = () => {
    refetchConnections();
  };

  const getConnectionDisplayName = (connection: Connection) => {
    return `${connection.name} (${connection.type}) - ${connection.host}:${connection.port}/${connection.database}`;
  };

  return (
    <Space direction="vertical" size="small" style={{ width: "100%" }}>
      <Select
        placeholder="Select a database connection"
        value={selectedConnectionId || activeConnections[0]?._id || null}
        onChange={onConnectionSelect}
        loading={connectionsLoading}
        size={size}
        style={{ width: "100%", height: "100%" }}
        showSearch
        optionFilterProp="label"
        notFoundContent={
          activeConnections.length === 0 ? (
            <div style={{ padding: 8, textAlign: "center" }}>
              <Text type="secondary">No active connections found</Text>
            </div>
          ) : null
        }
        prefix={
          <Tooltip title="Refresh connections">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              loading={connectionsLoading}
              onClick={handleRefresh}
              style={{ padding: "0 4px" }}
            />
          </Tooltip>
        }
      >
        {activeConnections.map((connection: Connection) => (
          <Select.Option
            key={connection._id}
            value={connection._id}
            label={getConnectionDisplayName(connection)}
          >
            {getConnectionDisplayName(connection)}
          </Select.Option>
        ))}
      </Select>
    </Space>
  );
}

export default ConnectionSelector;

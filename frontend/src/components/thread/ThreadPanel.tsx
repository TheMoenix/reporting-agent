import React, { useRef, useEffect, useState } from "react";
import {
  Card,
  Typography,
  Space,
  Badge,
  Empty,
  Flex,
  Button,
  Modal,
} from "antd";
import {
  MessageOutlined,
  RobotOutlined,
  BulbOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import MessageBubble from "./MessageBubble";
import ThreadInput from "./ThreadInput";
import ConnectionSelector from "../connection/ConnectionSelector";
import LLMSelector from "../llm/LLMSelector";

const { Text, Paragraph, Title } = Typography;

interface Message {
  type: "user" | "assistant";
  content: string;
  timestamp: string;
  id: string;
  interactionId?: string;
  rating?: string | null;
}

interface ThreadPanelProps {
  messages: Message[];
  threadId?: string;
  onSendMessage: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  progressStep?: string;
  progressMessage?: string;
  progressPercentage?: number;
  showProgress?: boolean;
  onViewDetails?: (interactionId: string) => void;
  selectedInteractionId?: string;
  selectedConnectionId?: string | null;
  onConnectionSelect: (connectionId: string | null) => void;
  selectedLlmProvider?: string;
  onLlmProviderSelect: (provider: string) => void;
}

function ThreadPanel({
  messages,
  threadId,
  onSendMessage,
  loading = false,
  disabled = false,
  progressStep,
  progressMessage,
  progressPercentage,
  showProgress = false,
  onViewDetails,
  selectedInteractionId,
  selectedConnectionId,
  onConnectionSelect,
  selectedLlmProvider,
  onLlmProviderSelect,
}: ThreadPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [tipsModalVisible, setTipsModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <Card
        style={{
          borderBottom: "1px solid #f0f0f0",
          borderRadius: 0,
          borderLeft: "none",
          borderRight: "none",
          borderTop: "none",
          boxShadow: "none",
        }}
        styles={{ body: { padding: "12px 16px" } }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap="small">
          <Space>
            <MessageOutlined style={{ color: "#1890ff" }} />
            <Text strong>Thread</Text>
            {messages.length > 0 && (
              <Badge
                count={messages.length}
                style={{ backgroundColor: "#1890ff" }}
              />
            )}
          </Space>
          <Space>
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              Config
            </Button>
            <Button
              type="text"
              icon={<BulbOutlined />}
              onClick={() => setTipsModalVisible(true)}
            >
              Tips
            </Button>
          </Space>
        </Flex>
      </Card>
      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
      >
        {messages.length === 0 ? (
          <Flex justify="center" align="center" style={{ height: "100%" }}>
            <Empty
              image={
                <RobotOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
              }
              description={
                <Paragraph type="secondary" style={{ fontSize: "16px" }}>
                  No messages yet. Start the conversation!
                </Paragraph>
              }
            />
          </Flex>
        ) : (
          <>
            {messages.map((message, index) => {
              // Show progress on the last AI message when processing
              const isLastMessage = index === messages.length - 1;
              const isAIMessage = message.type === "assistant";
              const shouldShowProgress =
                showProgress && isLastMessage && isAIMessage;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  threadId={threadId}
                  interactionId={message.interactionId}
                  initialRating={message.rating}
                  onViewDetails={onViewDetails}
                  isSelected={message.interactionId === selectedInteractionId}
                  progress={
                    shouldShowProgress
                      ? {
                          step: progressStep,
                          message: progressMessage,
                          percentage: progressPercentage,
                          visible: true,
                        }
                      : undefined
                  }
                />
              );
            })}

            {/* Show progress as a separate AI message when processing but no AI response yet */}
            {showProgress && (
              <MessageBubble
                message={{
                  type: "assistant",
                  content: "Processing...",
                  timestamp: new Date().toISOString(),
                  id: "processing",
                }}
                progress={{
                  step: progressStep,
                  message: progressMessage,
                  percentage: progressPercentage,
                  visible: true,
                }}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>{" "}
      {/* Input Section */}
      <ThreadInput
        onSubmit={onSendMessage}
        loading={loading}
        disabled={disabled}
      />
      {/* Config Modal */}
      <Modal
        title={
          <Space>
            <SettingOutlined style={{ color: "#1890ff" }} />
            <span>Configuration</span>
          </Space>
        }
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfigModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={() => setConfigModalVisible(false)}
          >
            Save
          </Button>,
        ]}
        width={600}
      >
        <Flex vertical gap="large">
          <ConnectionSelector
            selectedConnectionId={selectedConnectionId}
            onConnectionSelect={onConnectionSelect}
          />
          <LLMSelector
            value={selectedLlmProvider}
            onChange={onLlmProviderSelect}
          />
        </Flex>
      </Modal>
      {/* Tips Modal */}
      <Modal
        title={
          <Space>
            <BulbOutlined style={{ color: "#f18021" }} />
            <span>Tips for Best Results</span>
          </Space>
        }
        open={tipsModalVisible}
        onCancel={() => setTipsModalVisible(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setTipsModalVisible(false)}
          >
            Got it!
          </Button>,
        ]}
        width={700}
      >
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <Paragraph>
            <ul style={{ paddingLeft: "20px" }}>
              <li style={{ marginBottom: "8px" }}>
                <Text strong>Use natural language</Text> — no SQL knowledge
                required. Ask questions as you would to a human analyst.
              </li>
              <li style={{ marginBottom: "8px" }}>
                <Text strong>Be specific about time periods</Text> — include
                dates, ranges, or relative terms like "last month" or "this
                year".
              </li>
              <li style={{ marginBottom: "8px" }}>
                <Text strong>Include filtering criteria</Text> — add conditions
                like status, category, location, or any other relevant filters.
              </li>
              <li style={{ marginBottom: "8px" }}>
                <Text strong>Mention grouping and sorting</Text> — specify how
                you want data organized (by date, category, etc.) and sorted.
              </li>
              <li style={{ marginBottom: "8px" }}>
                <Text strong>Request aggregations clearly</Text> — use terms
                like "total", "count", "average", "sum", "maximum", or
                "minimum".
              </li>
              <li style={{ marginBottom: "8px" }}>
                <Text strong>Start simple, then refine</Text> — begin with basic
                queries and add complexity through follow-up questions.
              </li>
              <li style={{ marginBottom: "8px" }}>
                <Text strong>Review generated SQL</Text> — if you know SQL,
                check the query to ensure it matches your intent.
              </li>
            </ul>
          </Paragraph>

          <Title level={5} style={{ marginTop: "24px", color: "#f18021" }}>
            Example Patterns
          </Title>
          <Paragraph>
            <ul style={{ paddingLeft: "20px" }}>
              <li style={{ marginBottom: "12px" }}>
                <Text italic>
                  "Show me the top 10 customers by revenue for the last 6
                  months"
                </Text>
              </li>
              <li style={{ marginBottom: "12px" }}>
                <Text italic>
                  "Count the number of orders by status for this quarter"
                </Text>
              </li>
              <li style={{ marginBottom: "12px" }}>
                <Text italic>
                  "What's the average order value by month for 2024?"
                </Text>
              </li>
              <li style={{ marginBottom: "12px" }}>
                <Text italic>
                  "List all products with stock below 50 units, grouped by
                  category"
                </Text>
              </li>
              <li style={{ marginBottom: "12px" }}>
                <Text italic>
                  "Show daily sales totals for the past 30 days as a line chart"
                </Text>
              </li>
            </ul>
          </Paragraph>
        </div>
      </Modal>
    </div>
  );
}

export default ThreadPanel;

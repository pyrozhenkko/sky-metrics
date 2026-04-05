package org.ccpc.skymetrics.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrajectoryData implements Serializable {
    private List<Double> time;
    private List<Double> x_east;
    private List<Double> y_north;
    private List<Double> z_up;
}